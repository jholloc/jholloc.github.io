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

	savePopup: function() {
		var xml = XWFC.fleet.toSaveXML();
		$( "#LoadBtn" ).hide();
		$( "#XML textarea" ).val( xml );
		$( "#XML" ).fadeIn( "slow" );
	},

	loadPopup: function() {
		$( "#LoadBtn" ).show();
		$( "#XML" ).fadeIn( "slow" );
	},

	load: function() {
		var success = false;
		try {
			var xml = $.parseXML($( "#XML textarea" ).val());
			success = XWFC.fleet.fromSaveXML(xml);
		} catch (err) {}
		if (success) {
			$( "#XML textarea" ).removeClass( 'warning' );
			this.closePopup('XML');
		} else {
			$( "#XML textarea" ).addClass( 'warning' );
		}
	},

	reset: function() {
		XWFC.fleet.reset();
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

		this.reset = function() {
			this.fleet = [];
			this.selectedShip = null;
			this.updateFleetTable();
            if (this.fleet.length == 0) {
                $( "#FleetType" ).attr( 'disabled', null );
                $( "#FleetType" ).removeClass( 'disabled' );
            }
		}

		this.toSaveXML = function() {
			var xml = '<FLEET Type="{0}">\n'.format(this.fleetType);
			this.fleet.map(function(ship) {
				xml += '  <SHIP Name="{0}">\n'.format(ship.name);
				ship.upgrades.map(function(upgrade) {
					xml += '    <UPGRADE Name="{0}"/>\n'.format(upgrade.name);
				});
				xml += '  </SHIP>\n';
			});
			xml += '</FLEET>';
			return xml;
		}

		this.fromSaveXML = function(text) {
			this.reset();
			var xml = $( text );
			var type = xml.find( "FLEET" ).first().attr( "Type" );
			if (type) {
				$( "#FleetType" ).val( type );
				this.setFleetType( type );
			} else { 
				return false;
			}
			var self = this;
			xml.find( "SHIP" ).each( function(ship) {
				self.selectedShip = self.addShip( $( this ).attr( "Name" ) );
				if (!self.selectedShip) {
					return false;
				}
				$( this ).find( "UPGRADE" ).each( function(upgrade) {
					if (!self.addUpgrade( $( this ).attr( "Name" ) )) {
						return false;
					}
				} );
			} );
			return true;
		}

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
        
        this.fleetTooltip = function(ship) {
            var name = unescape(ship.name);
            var html = '<a href="#" class="tooltip">'
            if (ship.unique) {
                html += XWFC.uniqueSymbol() + name;
            } else {
                html += name;
            }
            var img = name.toLowerCase().replace(/"/g, '').replace(/ /g, '_').replace(/'/g, '').replace(/\//g, '-');
            html += '<span class="image">';
            html += '<img src="images/ships/{0}.png" />'.format(img);
            ship.upgrades.map(function(upgrade) {
                name = unescape(upgrade.name);
                img = name.toLowerCase().replace(/"/g, '').replace(/ /g, '_').replace(/'/g, '').replace(/\//g, '-');
                html += '<img src="images/upgrades/{0}.png" class="upgrade" />'.format(img);
            });
            html += '</span>';
            html += '</a>';
            return html;
        }

		this.updateFleetTable = function() {
            var self = this;
			$( "#Main table tbody tr" ).remove();
			var totalCost = 0;
			this.fleet.map(function(ship, idx) {
				var html = '<tr>';
                html += '<td>{0}</td>'.format(self.fleetTooltip(ship));
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
        
        this.popupTooltip = function(folder, unique, name) {
            var html = '<a href="#" class="tooltip">'
            if (unique) {
                html += XWFC.uniqueSymbol() + name;
            } else {
                html += name;
            }
            var img = name.toLowerCase().replace(/"/g, '').replace(/ /g, '_').replace(/'/g, '').replace(/\//g, '-');
            html += '<span class="image"><img src="images/{0}/{1}.png" /></span>'.format(folder, img);
            html += '</a>';
            return html;
        }

        this.shipRow = function(ship) {
            var html = '';
            if (ship.unique && this.hasNamedItem(ship.name)) {
                return;
            }      
            html += '<tr>';
            html += '<td>{0}</td>'.format(this.popupTooltip('ships', ship.unique, unescape(ship.name)));
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

        this.opFunction = function(opStr) {
            switch (opStr) {
                case '<': return function(a, b) { return a < b; }
                case '>': return function(a, b) { return a > b; }
                case '=': return function(a, b) { return a == b; }
            }
        }
                  
        this.canBuy = function(upgrade) {
            var self = this;
            var ship = this.selectedShip;
            var failingRules = upgrade.rules['CanBuy'].filter(function (rule) {
                if (rule.type == 'Check') {
                    var op = self.opFunction(rule.op);
                    if (rule.name && !op(ship[rule.field][name], rule.value)) {
                        return true;
                    } else if (!op(ship[rule.field], rule.value)) {
                        return true;
                    }
                }
                return false;
            });
            return failingRules.length == 0;
        }
        
        this.upgradeRow = function(upgrade) {
            var self = this;
            var html = '';
            if (upgrade.fleet.length > 0 && upgrade.fleet != this.fleetType) {
                return;
            }
            var numType = 0;
            var owned = upgrade.owned;
            if (this.selectedShip != null) {
                if (!this.canBuy(upgrade)) {
                    return;
                }
                if (upgrade.ship.length > 0 && upgrade.ship != this.selectedShip.type) {
                    return;
                }
                if (upgrade.shipSize.length > 0 && upgrade.shipSize != this.selectedShip.size) {
                    return;
                }
                numType = this.selectedShip.upgrades.filter(function (u) { return u.type == upgrade.type; }).length;
                if (!this.selectedShip.upgradeTypes.hasOwnProperty(upgrade.type)
                        || (!owned && numType >= this.selectedShip.upgradeTypes[upgrade.type])) {
                    return;
                }
                if (!owned && upgrade.unique && this.hasNamedItem(upgrade.name)) {
                    return;
                }
            }
            html +=  owned ? '<tr class="owned">' : '<tr>';
            html += '<td>{0}</td>'.format(this.popupTooltip('upgrades', upgrade.unique, unescape(upgrade.name)));
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
            return ship;
		}
        
        this.addUpgrade = function(name) {
            var upgrade = this.upgrades.filter(function (upgrade) { return upgrade.name == name; })[0];
            upgrade = $.extend({}, upgrade);
            upgrade.owned = true;
            this.selectedShip.upgrades.push(upgrade);
            this.updateUpgradeTable();
            this.updateFleetTable();
            return upgrade;
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
                var rules = { 'OnBuy': [], 'CanBuy': [] };
                node.find( "RULE" ).each( function() {
                    var rule = $( this );
                    var event = rule.attr( "Event" );
                    rule.find( "MODIFY" ).each( function() {
                        var action = $( this );
                        var field = action.attr( "Field" );
                        var name = action.attr( "Name" );
                        var value = parseInt(action.attr( "Value" ));
                        rules[event].push({ type:'Modify', field:field, name:name, value:value });
                    } );
                    rule.find( "CHECK" ).each( function() {
                        var action = $( this );
                        var field = action.attr( "Field" );
                        var name = action.attr( "Name" );
                        var op = action.attr( "Op" );
                        var value = parseInt(action.attr( "Value" ));
                        rules[event].push({ type:'Check', field:field, name:name, op:op, value:value });
                    } );
                } );
				self.upgrades.push({ name:name, type:type, cost:cost, unique:unique, fleet:fleet, ship:ship, shipSize:shipSize, rules:rules });
			} );

			xml.find( "SHIPS SHIP" ).each( function() {
				var node = $( this );
				var name = escape(node.attr( "Name" ));
				var type = node.attr( "Type" );
                var level = parseInt(node.attr( "Level" ));
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
				self.ships.push({ name:name, type:type, level:level, cost:cost, fleet:fleet, unique:unique, size:size, upgradeTypes:upgradeTypes });
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