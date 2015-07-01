// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
	String.prototype.format = function() {
		var args = arguments;
		return this.replace(/{(\d+)}/g, function(match, number) { 
			return (typeof args[number] != 'undefined') ? args[number]: match;
		});
	};
}

XWFC = {

	uniqueSymbol: function() {
		return '<span class="fa fa-circle dot"></span>';
	},

	closePopup: function(id) {
		$( "#" + id ).fadeOut( "slow" );
	},
    
	showPopup: function(id) {
		$( "#" + id ).fadeIn( "slow" );
	},

 	Fleet: function() {
		this.upgrades = [];
		this.ships = [];
        this.updateShipTable = function() {}
        this.selectedShip = null;
        
        this.setFleetType = function(type) {
            this.fleetType = type;
            var col = type == 'Imperial' ? 'red' : 'blue';
            $( "body" ).css( 'text-shadow', '1px 1px 1px ' + col );
            $( "select" ).css( 'text-shadow', '1px 1px 1px ' + col );
            if (this.upgrades || this.ships) {
                this.updateShipTable();
            }
        }

		this.setFleetType($( "#FleetType" ).val());

		this.fleet = [];
		this.shipSort = { field:null, dir:null };
		this.upgradeSort = { field:null, dir:null };

		this.sort = function(type, field, dir) {
			if (type == "Ships") {
				this.ships.sort(function (a, b) {
					if (typeof(a[field]) == "string") return a[field].localeCompare(b[field]);
					else return a[field] - b[field];
				});
				if (dir == 'desc') this.ships.reverse();
				this.shipSort = { field:field, dir:dir };
				this.updateShipTable();
			} else if (type == "Upgrades") {
				this.upgrades.sort(function (a, b) {
					if (typeof(a[field]) == "string") return a[field].localeCompare(b[field]);
					else return a[field] - b[field];
				});
				if (dir == 'desc') this.upgrades.reverse();
				this.upgradeSort = { field:field, dir:dir };
				this.updateUpgradeTable();		
			}
		}

		this.updateFleetTable = function() {
			$( "#Main table tbody tr" ).remove();
			var totalCost = 0;
			this.fleet.map(function(ship, idx) {
				var html = '<tr>';
				if (ship.unique) {
					html += '<td>{0}{1}</td>'.format(XWFC.uniqueSymbol(), unescape(ship.name));
				} else {
					html += '<td>{0}</td>'.format(unescape(ship.name));
				}
				html += '<td>{0}</td>'.format(ship.type);
				html += '<td><button class="pure-button" onclick="XWFC.fleet.upgradeShip(' + idx + ')">Upgrade</button></td>';
                var costStr = '{0}'.format(ship.cost);
                var cost = ship.cost;
                if (ship.upgrades.length > 0) {
                	var upCost = ship.upgrades.reduce(function(sum, upgrade) { return sum + upgrade.cost; }, 0);
                    costStr += (upCost >= 0 ? ' +' + upCost : ' ' + upCost);
                    cost += upCost;
                }
				html += '<td>{0}</td>'.format(costStr);
				html += '<td><button class="pure-button" onclick="XWFC.fleet.removeShip(' + idx + ')">Remove</button></td>'
				html += '</tr>';
				$( "#Main table tbody" ).append( html );
				totalCost += cost;
			});
			$( "#TotalCost" ).html( totalCost );
		}

		this.hasNamedItem = function(name) {
			if (this.fleet.filter(function(ship) { return ship.name == name; }).length != 0) {
				return true;
			}
			var allUpgrades = [].concat.apply([], this.fleet.map(function (ship) { return ship.upgrades }));
			if (allUpgrades.filter(function(upgrade) { return upgrade.name == name; }).length != 0) {
				return true;
			}
			return false;
		}
        
        this.tooltipName = function(folder, unique, name) {
            var html = '<a href="#" class="tooltip">'
            if (unique) {
                html += XWFC.uniqueSymbol() + name;
            } else {
                html += name;
            }
            var img = name.toLowerCase().replace(/"/g, '').replace(/ /g, '_').replace(/'/g, '').replace(/\//g, '-');
            html += '<span class="image"><img src="images/{0}/{1}.png" style="float:right;" /></span>'.format(folder, img);
            html += '</a>';
            return html;
        }
        
        this.shipRow = function(ship) {
            var html = '';
            if (ship.unique && this.hasNamedItem(ship.name)) {
                return;
            }      
            html += '<tr>';
            html += '<td>{0}</td>'.format(this.tooltipName('ships', ship.unique, unescape(ship.name)));
            html += '<td>{0}</td>'.format(ship.type);
            html += '<td>{0}</td>'.format(ship.cost);
            html += '<td>{0}</td>'.format('<button class="pure-button" onclick="XWFC.fleet.addShip(\'' + ship.name + '\')">Add</button>');
            html += '</tr>';
            return html;
        }

		this.updateShipTable = function() {
            var self = this;
            
            $( "#Ships table" ).children().remove();
			html = '';
			fields = [ 'name', 'type', 'cost', '' ];
			html += '<thead><tr>';
			fields.map(function(field) {
				if (self.shipSort.field == field) {
					var dir = self.shipSort.dir == 'asc' ? 'desc': 'asc';
					var icon = self.shipSort.dir == 'asc' ? 'sort-desc': 'sort-asc';
				} else {
					var dir = 'asc';
					var icon = 'sort';
				}
				var link = field.length > 0
					? '<a href="#" onclick="XWFC.fleet.sort(\'Ships\', \'{0}\', \'{2}\')" class="fa fa-{1} sort"/>'.format(field, icon, dir)
					: '';
				html += '<th>{0}<span>{1}</span></th>'.format(link, field);
			});
			html += '</thead></tr>';
			this.ships.filter(function(ship) { return ship.fleet == self.fleetType; }).map(function(ship) {
                html += self.shipRow(ship);
			});
			$( "#Ships table" ).html( html );
		}
        
        this.upgradeRow = function(upgrade) {
            var self = this;
            var html = '';
            if (upgrade.fleet.length > 0 && upgrade.fleet != self.fleetType) {
                return;
            }
            var numType = 0;
            var owned = upgrade.owned;
            if (self.selectedShip != null) {
                if (upgrade.ship.length > 0 && upgrade.ship != self.selectedShip.type) {
                    return;
                }
                if (upgrade.shipSize.length > 0 && upgrade.shipSize != self.selectedShip.size) {
                    return;
                }
                numType = self.selectedShip.upgrades.filter(function (u) { return u.type == upgrade.type; }).length;
                if (!self.selectedShip.upgradeTypes.hasOwnProperty(upgrade.type)
                        || (!owned && numType >= self.selectedShip.upgradeTypes[upgrade.type])) {
                    return;
                }
                if (!owned && upgrade.unique && self.hasNamedItem(upgrade.name)) {
                    return;
                }
            }
            html +=  owned ? '<tr class="owned">' : '<tr>';
            html += '<td>{0}</td>'.format(this.tooltipName('upgrades', upgrade.unique, unescape(upgrade.name)));
            html += '<td>{0}</td>'.format(upgrade.type);
            html += '<td>{0}</td>'.format(upgrade.cost);
            html += owned
                ? '<td>{0}</td>'.format('<button class="pure-button" onclick="XWFC.fleet.removeUpgrade(\'' + upgrade.name + '\')">Remove</button>')
                : '<td>{0}</td>'.format('<button class="pure-button" onclick="XWFC.fleet.addUpgrade(\'' + upgrade.name + '\')">Add</button>');
            html += '</tr>';
            return html;
        }
        
        this.updateUpgradeTable = function() {
            var self = this;
        
            $( "#Upgrades table" ).children().remove();
			var html = '';
			var fields = [ 'name', 'type', 'cost', '' ];
			html += '<thead><tr>';
			fields.map(function(field) {
				if (self.upgradeSort.field == field) {
					var dir = self.upgradeSort.dir == 'asc' ? 'desc': 'asc';
					var icon = self.upgradeSort.dir == 'asc' ? 'sort-desc': 'sort-asc';
				} else {
					var dir = 'asc';
					var icon = 'sort';
				}
				var link = field.length > 0
					? '<a href="#" onclick="XWFC.fleet.sort(\'Upgrades\', \'{0}\', \'{2}\')" class="fa fa-{1} sort"/>'.format(field, icon, dir)
					: '';
				html += '<th>{0}<span>{1}</span></th>'.format(link, field);
			});
			html += '</thead></tr>';
            if (self.selectedShip != null) {
                this.selectedShip.upgrades.map(function(upgrade) { html += self.upgradeRow(upgrade); });
            }
            this.upgrades.map(function(upgrade) { html += self.upgradeRow(upgrade); });
			$( "#Upgrades table" ).html( html );
        }

		this.addShip = function(name) {
			var ship = this.ships.filter(function (ship) { return ship.name == name; })[0];
            ship = $.extend({}, ship);
            ship.upgrades = [];
			this.fleet.push(ship);
			this.updateFleetTable();
            if (this.fleet.length > 0) {
                this.updateShipTable();
                $( "#FleetType" ).attr( 'disabled', 'disabled' );
                $( "#FleetType" ).addClass( 'disabled' );
            }
		}
        
        this.addUpgrade = function(name) {
            var upgrade = this.upgrades.filter(function (upgrade) { return upgrade.name == name; })[0];
            upgrade = $.extend({}, upgrade);
            upgrade.owned = true;
            this.selectedShip.upgrades.push(upgrade);
            this.updateUpgradeTable();
            this.updateFleetTable();
        }

        this.removeUpgrade = function(name) {
        	var idx = -1;
        	this.selectedShip.upgrades.map(function (upgrade, i) { if (upgrade.name == name) idx = i; });
        	this.selectedShip.upgrades.splice(idx, 1);
            this.updateUpgradeTable();
            this.updateFleetTable();
        }
        
        this.upgradeShip = function(idx) {
            this.selectedShip = this.fleet[idx];
            this.updateUpgradeTable();
            XWFC.showPopup('Upgrades');
        }
        
        this.removeShip = function(idx) {
            this.fleet.splice(idx, 1);
            this.updateFleetTable();
            this.updateShipTable();
            if (this.fleet.length == 0) {
                $( "#FleetType" ).attr( 'disabled', null );
                $( "#FleetType" ).removeClass( 'disabled' );
            }
        }
        
        this.populateDictionaries = function(xml) {
			var self = this;

			xml.find( "UPGRADES UPGRADE" ).each( function() {
				var node = $( this );
				var name = escape(node.attr( "Name" ));
				var type = node.attr( "Type" );
				var cost = parseInt(node.attr( "Cost" ));
				var unique = node.attr( "Unique" ).toUpperCase() == "TRUE";
				var fleet = node.attr( "FleetType" );
				var ship = node.attr( "Ship" );
                var shipSize = node.attr( "ShipSize" );
				self.upgrades.push({ name:name, type:type, cost:cost, unique:unique, fleet:fleet, ship:ship, shipSize:shipSize });
			} );

			xml.find( "SHIPS SHIP" ).each( function() {
				var node = $( this );
				var name = escape(node.attr( "Name" ));
				var type = node.attr( "Type" );
				var cost = parseInt(node.attr( "Cost" ));
				var fleet = node.attr( "FleetType" );
				var unique = node.attr( "Unique" ).toUpperCase() == "TRUE";
                var size = node.attr("Size");
				var upgradeTypes = { Modification: 1, Title: 1 };
				node.attr( "UpgradeTypes" ).split(",").map(function (type) {
					if (!upgradeTypes.hasOwnProperty(type)) {
						upgradeTypes[type] = 0;
					}
					upgradeTypes[type] += 1;
				});
				self.ships.push({ name:name, type:type, cost:cost, fleet:fleet, unique:unique, size:size, upgradeTypes:upgradeTypes });
			} );

			this.sort('Ships', 'name', 'asc');
			this.sort('Upgrades', 'name', 'asc');
		}
        
        this.initialise = function(xml) {
            var $xml = $( xml );
            XWFC.fleet.populateDictionaries($xml);
            XWFC.fleet.updateShipTable();
        }
	},

	loadXML: function() {
		$.ajax( {
		    type: "GET",
		    url: "data.xml",
		    dataType: "xml",
		    success: function(xml) {
                XWFC.fleet.initialise(xml);
		    },
            error: function() {
                XWFC.loadLocalFile();
            }
		} );
	},
    
    loadLocalFile: function() {
        var self = this;
        
        $( "#FileLoad" ).show();
        $( "#FileInput" ).change( function(evt) {
            var files = evt.target.files;
            var file = files[0];
            var reader = new FileReader();
            
            var text = '';
            reader.onload = (function (f) {
                return function(e) {
                    text = e.target.result;
                    var xml = $.parseXML( text );
                    XWFC.fleet.initialise(xml);
                    $( "#FileLoad" ).hide();
                }
            })(file);
            reader.readAsText(file);
        } );
    },
}