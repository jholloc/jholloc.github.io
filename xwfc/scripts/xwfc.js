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

		this.updateFleetTable = function() {
			$( "#Main table tbody tr" ).remove();
			var totalCost = 0;
			this.fleet.map(function(ship, idx) {
				var html = '<tr>';
				if (ship.unique) {
					html += '<td>{0}{1}</td>'.format(XWFC.uniqueSymbol(), ship.name);
				} else {
					html += '<td>{0}</td>'.format(ship.name);
				}
				html += '<td>{0}</td>'.format(ship.type);
				html += '<td><button class="pure-button" onclick="XWFC.fleet.upgradeShip(' + idx + ')">Upgrade</button></td>';
                var costStr = '{0}'.format(ship.cost);
                var cost = ship.cost;
                if (ship.upgrades.length > 0) {
                	var upCost = ship.upgrades.reduce(function(sum, upgrade) { return sum + upgrade.cost; }, 0);
                    costStr += (' +' + upCost);
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

		this.updateShipTable = function() {
            var self = this;
            
            $( "#Ships table" ).children().remove();
			html = '';
			fields = [ 'name', 'type', 'cost', '' ];
			html += '<thead><tr>';
			fields.map(function(field) { html += '<th>{0}</th>'.format(field); });
			html += '</thead></tr>';
			this.ships.filter(function(ship) { return ship.fleet == self.fleetType; }).map(function(ship) {
                if (ship.unique && self.fleet.filter(function(s) { return s.name == ship.name; }).length != 0) {
                    return;
                }
				html += '<tr>';
				if (ship.unique) {
                    html += '<td valign="middle">{0}</td>'.format(XWFC.uniqueSymbol() + ship.name);
				} else {
					html += '<td>{0}</td>'.format(ship.name);
				}
				html += '<td>{0}</td>'.format(ship.type);
				html += '<td>{0}</td>'.format(ship.cost);
				html += '<td>{0}</td>'.format('<button class="pure-button" onclick="XWFC.fleet.addShip(\'' + ship.name + '\')">Add</button>');
				html += '</tr>';
			});
			$( "#Ships table" ).html( html );
		}
        
        this.updateUpgradeTable = function() {
            var self = this;
        
            $( "#Upgrades table" ).children().remove();
			var html = '';
			var fields = [ 'name', 'type', 'cost', '' ];
			html += '<thead><tr>';
			fields.map(function(field) { html += '<th>{0}</th>'.format(field); });
			html += '</thead></tr>';
            this.upgrades.map(function(upgrade) {
            	var numType = self.selectedShip.upgrades.filter(function (u) { return u.type == upgrade.type; }).length;
            	var owned = (self.selectedShip.upgrades.filter(function (u) { return u.name == upgrade.name; }).length > 0);
                if (!self.selectedShip.upgradeTypes.hasOwnProperty(upgrade.type)
                	|| (!owned && numType >= self.selectedShip.upgradeTypes[upgrade.type])) {
                	return;
                }
                html +=  owned ? '<tr class="owned">' : '<tr>';
				html += '<td>{0}</td>'.format(upgrade.name);
				html += '<td>{0}</td>'.format(upgrade.type);
                html += '<td>{0}</td>'.format(upgrade.cost);
				html += owned
                    ? '<td>{0}</td>'.format('<button class="pure-button" onclick="XWFC.fleet.removeUpgrade(\'' + upgrade.name + '\')">Remove</button>')
                    : '<td>{0}</td>'.format('<button class="pure-button" onclick="XWFC.fleet.addUpgrade(\'' + upgrade.name + '\')">Add</button>');
				html += '</tr>';
            });
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
            this.selectedShip.upgrades.push($.extend({}, upgrade));
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
				var name = node.attr( "Name" );
				var type = node.attr( "Type" );
				var cost = parseInt(node.attr( "Cost" ));
				var unique = node.attr( "Unique" ) == "True";
				self.upgrades.push({ name:name, type:type, cost:cost, unique:unique });
			} );

			xml.find( "SHIPS SHIP" ).each( function() {
				var node = $( this );
				var name = node.attr( "Name" );
				var type = node.attr( "Type" );
				var cost = parseInt(node.attr( "Cost" ));
				var fleet = node.attr( "FleetType" );
				var unique = node.attr( "Unique" ) == "True";
				var upgradeTypes = {};
				node.attr( "UpgradeTypes" ).split(",").map(function (type) {
					if (!upgradeTypes.hasOwnProperty(type)) {
						upgradeTypes[type] = 0;
					}
					upgradeTypes[type] += 1;
				});
				self.ships.push({ name:name, type:type, cost:cost, fleet:fleet, unique:unique, upgradeTypes:upgradeTypes });
			} );
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