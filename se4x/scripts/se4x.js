
if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) { 
            return (typeof args[number] != 'undefined') ? args[number]: match;
        });
    };
}

var SE4X = SE4X || {};

SE4X.tableHeader = function(names) {
    var html = '<thead><tr>';
    names.map(function(name) {
        html += '<th>{0}</th>'.format(name)
    });
    html += '</tr></thead>';
    return html;
}

SE4X.Tech = function(name, level, costs) {
    this.name = name;
    this.level = level;
    this.costs = costs;
    this.upgrade = 0;
    this.id = 'Tech' + SE4X.Tech.idx;
    SE4X.Tech.idx += 1;

    this.applyUpgrade = function() {
        this.level += this.upgrade;
        this.upgrade = 0;
    }

    this.upgradeCost = function() {
        var cost = 0;
        for (var i = 0; i < this.upgrade; i++) {
            cost += this.costs[this.level + i + 1];
        }
        return cost;
    }

    this.totalLevel = function() {
        return this.level + this.upgrade;
    }

    this.maxLevel = function() {
        return this.costs.length - 1;
    }

    this.canDecrTech = function() {
        return this.upgrade > 0;
    }

    this.canIncrTech = function() {
        return this.totalLevel() < this.maxLevel();
    }
}

SE4X.Tech.idx = 0;

SE4X.TechTree = function() {
    this.techs = [];

    this.incrTech = function(id) {
        var tech = this.techs.filter(function(tech) { return tech.id == id })[0];
        tech.upgrade += 1;
    }

    this.decrTech = function(id) {
        var tech = this.techs.filter(function(tech) { return tech.id == id })[0];
        tech.upgrade -= 1;
    }

    this.load = function(xml) {
        var self = this;
        xml.find( "TECHS TECH" ).each( function() {
            var node = $( this );
            var name = node.attr( "Name" );
            var startLevel = parseInt(node.attr( "StartLevel" ));
            var costs = node.attr( "Costs" ).split(",").map(function(el) { return parseInt(el); });
            self.techs.push(new SE4X.Tech(name, startLevel, costs));
        } );
    }

    this.techBuys = function() {
        return this.techs.reduce(function(sum, tech) { return sum + tech.upgradeCost(); }, 0);
    }

    this.applyTurn = function() {
        this.techs.map(function(tech) { tech.applyUpgrade(); });
    }
}

SE4X.Ship = function(type, name, cost, attack, defense, hull, maint) {
    this.type = type;
    this.name = name;
    this.cost = cost;
    this.attack = attack;
    this.defense = defense;
    this.hull = hull;
    this.maint = maint;
    this.id = 'Ship' + SE4X.Ship.idx;
    SE4X.Ship.idx += 1;
},

SE4X.Ship.idx = 0;

SE4X.Fleet = function(ship, number) {
    this.ship = ship;
    this.count = 0;
    this.number = number;
    this.id = 'Fleet' + SE4X.Fleet.idx;
    SE4X.Fleet.idx += 1;
    this.purchased = 0;
    this.killed = 0;

    this.maint = function() {
        return this.ship.maint * this.count;
    }

    this.counter = function() {
        return '{0} #{1}'.format(this.ship.name, this.number);
    }

    this.purchaseCosts = function() {
        return this.ship.cost * this.purchased;
    }

    this.purchaseMaint = function() {
        return this.ship.maint * this.purchased;
    }

    this.currentMaint = function() {
        return this.ship.maint * this.count;
    }

    this.totalCount = function() {
        return this.count + this.purchased;
    }

    this.applyPurchase = function() {
        this.count += this.purchased;
        this.purchased = 0;
    }

    this.applyKills = function() {
        this.count -= this.killed;
        this.killed = 0;
    }

    this.canDecrFleet = function() {
        return this.purchased > 0;
    }

    this.canIncrFleet = function() {
        return this.totalCount() < 6;
    }

    this.canKillFleet = function() {
        return this.killed < this.count;
    }

    this.maintLost = function() {
        return this.killed * this.ship.maint;
    }
}

SE4X.Fleet.idx = 0;

SE4X.ShipYard = function() {
    this.fleets = [];
    this.ships = [];
    this.fleetNumbers = {};

    this.load = function(xml) {
        var self = this;
        xml.find( "SHIPS SHIP" ).each( function() {
            var node = $( this );
            var type = node.attr( "Type" );
            var name = node.attr( "Name" );
            var cost = parseInt(node.attr( "Cost" ));
            var attack = node.attr( "Attack" );
            var defense = node.attr( "Defense" );
            var hull = node.attr( "Hull" );
            var maint = node.attr( "Maint" );
            self.ships.push(new SE4X.Ship(type, name, cost, attack, defense, hull, maint));
        } );
    }

    this.newFleet = function(ship) {
        if (!(ship.id in this.fleetNumbers)) {
            this.fleetNumbers[ship.id] = 1;
        }
        var fleet = new SE4X.Fleet(ship, this.fleetNumbers[ship.id]);
        this.fleetNumbers[ship.id] += 1;

        return fleet;
    }

    this.shipBuys = function() {
        return this.fleets.reduce(function(sum, fleet) { return sum + fleet.purchaseCosts(); }, 0);
    }

    this.currentMaint = function() {
        return this.fleets.reduce(function(sum, fleet) { return sum + fleet.maint(); }, 0);
    }

    this.purchaseMaint = function() {
        return this.fleets.reduce(function(sum, fleet) { return sum + fleet.purchaseMaint(); }, 0);
    }

    this.maintLost = function() {
        return this.fleets.reduce(function(sum, fleet) { return sum + fleet.maintLost(); }, 0);
    }

    this.incrFleet = function(id) {
        var fleet = this.fleets.filter(function(fleet) { return fleet.id == id })[0];
        fleet.purchased += 1;
    }

    this.decrFleet = function(id) {
        var fleet = this.fleets.filter(function(fleet) { return fleet.id == id })[0];
        fleet.purchased -= 1;
    }

    this.killFleet = function(id) {
        var fleet = this.fleets.filter(function(fleet) { return fleet.id == id })[0];
        fleet.killed += 1;
    }

    this.addFleet = function(id) {
        var ship = this.ships.filter(function(ship) { return ship.id == id })[0];
        var fleet = this.newFleet(ship);
        fleet.purchased += 1;
        this.fleets.push(fleet);
    }

    this.applyTurn = function() {
        this.fleets.map(function(fleet) { fleet.applyPurchase(); });
        this.fleets.map(function(fleet) { fleet.applyKills(); });
    }
}

SE4X.Turn = function(number, techTree, shipYard) {
    this.number = number;
    this.carry = 0;
    this.colony = 10;
    this.mineral = 0;
    this.pipeline= 0;
    this.maint = shipYard.currentMaint();
    this.bid = 0;
    this.techTree = techTree;
    this.shipYard = shipYard;
    this.upgrade = 0;
    this.isCurrent = true;
    this.history = {};

    this.income = function() {
        return this.carry + this.colony + this.mineral + this.pipeline;
    };
    
    this.total = function() {
        return this.income() - this.maint - this.bid;
    }
    
    this.techSpend = function() {
        if (this.isCurrent) {
            return this.techTree.techBuys();
        } else {
            return this.history['techSpend'];
        }
    }
    
    this.shipSpend = function() {
        if (this.isCurrent) {
            return this.shipYard.shipBuys();
        } else {
            return this.history['shipSpend'];
        }
    }
    
    this.shipMaint = function() {
        if (this.isCurrent) {
            return this.shipYard.currentMaint();
        } else {
            return this.history['shipMaint'];
        }
    }
    
    this.purchaseMaint = function() {
        if (this.isCurrent) {
            return this.shipYard.purchaseMaint();
        } else {
            return this.history['purchaseMaint'];
        }
    }

    this.remain = function() {
        return this.total() - this.techSpend() - this.shipSpend();
    }

    this.maintLost = function() {
        if (this.isCurrent) {
            return this.shipYard.maintLost();
        } else {
            return this.history['maintLost'];
        }
    }

    this.record = function() {
        this.history['techSpend']       = this.techSpend();
        this.history['shipSpend']       = this.shipSpend();
        this.history['shipMaint']       = this.shipMaint();
        this.history['purchaseMaint']   = this.purchaseMaint();
        this.history['maintLost']       = this.maintLost();
    }

    this.ok = function() {
        return (this.remain() - this.upgrade) >= 0;
    }
}

SE4X.closePopup = function() {
    SE4X.view.popup.close();
}

SE4X.Popup = function(view) {
    this.visible = 0;
    this.view = view;

    this.close = function() {
        $( "#PopUp" ).fadeOut( "slow" );
        $( "#PopUp #Content" ).children().remove();
        this.view.update();
    }

    this.show = function(content) {
        $( "#PopUp #Content" ).append( content );
        $( "#PopUp" ).fadeIn( "slow" );
        $( "#PopUp #CloseBtn" ).click( SE4X.closePopup );
    }
}

SE4X.Game = function() {
    this.turns = [];
    this.techTree = new SE4X.TechTree();
    this.shipYard = new SE4X.ShipYard();

    this.setup = function() {
        var scout = this.shipYard.ships.filter(function(ship) { return ship.type == 'SC' })[0];
        var scoutFleet = this.shipYard.newFleet(scout);
        scoutFleet.count += 3;
        this.shipYard.fleets.push(scoutFleet);
    }

    this.load = function(xml) {
        this.xml = xml;
        this.techTree.load(xml);
        this.shipYard.load(xml);
        this.setup();
        this.newTurn();
    }

    this.currentTurn = function() {
        return this.turns[this.turns.length - 1];
    }

    this.newTurn = function() {
        var turn = null;
        if (this.turns.length > 0) {
            var currentTurn = this.currentTurn();
            currentTurn.record();

            this.techTree.applyTurn();
            this.shipYard.applyTurn();

            turn = new SE4X.Turn(this.turns.length + 1, this.techTree, this.shipYard);
            
            currentTurn.isCurrent = false;
            turn.carry = currentTurn.remain() - currentTurn.upgrade;
            turn.colony = currentTurn.colony;
            turn.pipeline = currentTurn.pipeline;
        } else {
            turn = new SE4X.Turn(this.turns.length + 1, this.techTree, this.shipYard);
        }
        this.turns.push(turn);
    }
    
    this.reset = function() {
        this.turns = [];
        this.techTree = new SE4X.TechTree();
        this.shipYard = new SE4X.ShipYard();
        this.load(this.xml);
    }
}

SE4X.TurnView = function(gameView, turn) {
    this.gameView = gameView;
    this.turn = turn;

    this.addTurnColumn = function() {
        $( "table#GameTable thead tr" ).append( '<th>Turn {0}</th>'.format(this.turn.number) );

        var turn = this.turn;
        this.gameView.rows.map(function(row) {
            var val = 'undefined';
            if (row.field != null) {
                val = turn[row.field];
            } else {
                val = turn[row.func]();
            }
            var html = '';
            if (turn.isCurrent) {
                if (row.onclick != null) {
                    html += '<button class="pure-button" onclick="{0}">{1}</button>'.format(row.onclick, val);
                } else if (row.editable) {
                    html += '<input type="number" id="Input{0}" oninput="SE4X.view.onInput(\'{0}\')" value="{1}" />'.format(row.id, val);
                } else {
                    html += '<span>{0}</span>'.format(val);
                }
            } else {
                html += '<span>{0}</span>'.format(val);
            }
            $( "table#GameTable tr#" + row.id ).append( '<td>{0}</td>'.format(html) );
        });

        $( "table#GameTable tfoot tr td button" ).remove();
        $( "table#GameTable tfoot tr" ).append( '<td><button class="pure-button" id="NextTurn" onclick="SE4X.view.nextTurn()">Next</button></td>' );
    };

    this.updateTurnColumn = function() {
        var turn = this.turn;
        this.gameView.rows.map(function(row) {
            var cell = $( "table#GameTable tr#" + row.id ).children().last();

            var val = 'undefined';
            if (row.field != null) {
                val = turn[row.field];
            } else {
                val = turn[row.func]();
            }
            if (!row.editable) {
                cell.children().html( val );
            }
        });
    };

    this.update = function() {
        this.updateTurnColumn();

        $( "#NextTurn" ).attr( "disabled", this.turn.ok() ? null : "disabled" );
        if (this.turn.ok()) {
            $( "#GameTable #total" ).children().removeClass( "Warn" );
            $( "#GameTable #remain" ).children().removeClass( "Warn" );
        } else {
            if (this.turn.total() <= 0) {
                $( "#GameTable #total" ).children().addClass( "Warn" );
            }
            $( "#GameTable #remain" ).children().addClass( "Warn" );
        }
    }
}

SE4X.GameView = function(game) {
    this.game = game;
    this.turnViews = [];
    this.popup = new SE4X.Popup(this);
    this.techTreeView = new SE4X.TechTreeView(this.game.techTree);
    this.shipYardView = new SE4X.ShipYardView(this.game.shipYard);
    this.shipKilledView = new SE4X.ShipKilledView(this.game.shipYard);

    var row = function(heading, field, func, onclick, editable, total) {
        return { heading: heading, field: field, func: func, onclick: onclick, editable:editable, total:total, id:(field || func) };
    }

    this.rows = [
        row('Carry Over',       'carry',    null,       null, false, false),
        row('Colony CPs',       'colony',   null,       null, true, false),
        row('Mineral CPs',      'mineral',  null,       null, true, false),
        row('MS Pipeline CPs',  'pipeline', null,       null, true, false),
        row('Total Income',     null,       'income',   null, false, true),
        row('Maintenance',      null,       'shipMaint',null, false, false),
        row('Turn order bid',   'bid',      null,       null, true, false),
        row('Total CPs',        null,       'total',    null, false, true),
        row('Tech spending',    null,       'techSpend','SE4X.view.buyTechs()', false, false),
        row('Ship spending',    null,       'shipSpend','SE4X.view.buyShips()', false, false),
        row('Remaining CPs',    null,       'remain',   null, false, true),
        row('Upgrade CPs',      'upgrade',  null,       null, true, false),
        row('Maint. gained',    null,       'purchaseMaint', null, false, false),
        row('Maint. lost',      null,       'maintLost', 'SE4X.view.killShips()', false, false),
    ];

    this.nextTurn = function() {
        this.game.newTurn();
        $( "#GameTable" ).remove();
        this.render();

        var body = $( "#Body" ).get( 0 );
        body.scrollLeft = body.scrollWidth;
    }

    this.onInput = function(id) {
        var turn = this.game.currentTurn();
        var row = this.rows.filter(function(row) { return row.id == id; })[0];
        var val = parseInt($( "#Input" + id ).val());
        turn[row.field] = val;
        this.update();
    }

    this.tableRows = function() {
        var html = '';
        this.rows.map(function(row) {
            if (row.total) {
                html += '<tr id="{0}" class="pure-table-odd"><td>{1}</td></tr>'.format(row.id, row.heading);
            } else {
                html += '<tr id="{0}"><td>{1}</td></tr>'.format(row.id, row.heading);
            }
        });
        return html;
    }

    this.toHTML = function() {
        var html = '';
        html += this.gameTable();
        return html;
    }

    this.gameTable = function() {
        var html = '<table class="pure-table" id="GameTable">';
        html += '<thead><tr><th></th></tr></thead>';
        html += this.tableRows();
        html += '<tfoot><tr><td></td></tr></tfoot>';
        html += '</table>';
        return html;
    }
    
    this.reset = function() {
        this.game.reset();
        $( "#Body table" ).remove();
        this.render();
    }
    
    this.undo = function() {
        window.alert("not yet implemented");
        // this.game.undo();
        // $( "#Body table" ).remove();
        // this.render();
    }
    
    this.saveDumpFile = function() {
        window.alert("not yet implemented");
    }
    
    this.loadDumpFile = function() {
        window.alert("not yet implemented");
    }
    
    this.initialise = function(xml) {
        var $xml = $( xml );
        this.game.load($xml);
        this.render();
        $( "#Menu" ).show();
    }
    
    this.loadLocalFile = function() {
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
                    self.initialise(xml);
                    $( "#FileLoad" ).hide();
                }
            })(file);
            reader.readAsText(file);
        } );
    }
    
    this.load = function() {
        var self = this;
        
        $.ajax( {
            type: "GET",
            url: "data.xml",
            dataType: "xml",
            success: function(xml) {
                self.initialise(xml);
            },
            error: function() {
                self.loadLocalFile();
            }
        } );
    }

    this.render = function() {
        $( "#Body" ).append( this.gameTable() );
        var self = this;
        this.turnViews = [];
        this.game.turns.map(function(turn) {
            self.turnViews.push(new SE4X.TurnView(self, turn));
        });
        this.turnViews.map(function(turnView) { turnView.addTurnColumn(); });
    }

    this.update = function() {
        var turnView = this.turnViews[this.turnViews.length - 1];
        turnView.update();
    }

    this.buyTechs = function() {
        var turn = this.game.currentTurn();

        var content = '<h2>Purchase Technologies</h2>';
        content += '<table class="pure-table">';
        content += '<tr><td>Avialable CP:</td><td>' + turn.remain() + '</td></tr>';
        content += '<tr><td>Spent CP:</td><td id="TechSpend">' + turn.techSpend() + '</td></tr>';
        content += '</table>';
        content += '<div id="Tables">'
        content += this.techTreeView.techTable();
        content += '</div>'
        
        this.popup.show(content);
        this.techTreeView.update();
    }

    this.buyShips = function() {
        var turn = this.game.currentTurn();

        var content = '<h2>Purchase Ships</h2>';
        content += '<table class="pure-table">';
        content += '<tr><td>Avialable CP:</td><td>' + turn.remain() + '</td></tr>';
        content += '<tr><td>Spent CP:</td><td id="ShipSpend">' + turn.shipSpend() + '</td></tr>';
        content += '</table>';
        content += '<div id="Tables">'
        content += this.shipYardView.fleetTable();
        content += this.shipYardView.shipTable();
        content += '</div>'
        
        this.popup.show(content);
        this.shipYardView.update();
    }

    this.killShips = function() {
        var turn = this.game.currentTurn();

        var content = '<h2>Kill Ships</h2>';
        content += '<table class="pure-table">';
        content += '<tr><td>Maintenance Lost:</td><td id="MaintLost">' + turn.maintLost() + '</td></tr>';
        content += '</table>';
        content += '<div id="Tables">'
        content += this.shipKilledView.fleetTable();
        content += '</div>'
        
        this.popup.show(content);
        this.shipKilledView.update();
    }

    this.incrTech = function(id) {
        this.game.techTree.incrTech(id);
        var turn = this.game.currentTurn();
        $( "#TechSpend" ).html( turn.techSpend() );
        this.techTreeView.update();
    }

    this.decrTech = function(id) {
        this.game.techTree.decrTech(id);
        var turn = this.game.currentTurn();
        $( "#TechSpend" ).html( turn.techSpend() );
        this.techTreeView.update();
    }

    this.incrFleet = function(id) {
        this.game.shipYard.incrFleet(id);
        var turn = this.game.currentTurn();
        $( "#ShipSpend" ).html( turn.shipSpend() );
        this.shipYardView.update();
    }

    this.decrFleet = function(id) {
        this.game.shipYard.decrFleet(id);
        var turn = this.game.currentTurn();
        $( "#ShipSpend" ).html( turn.shipSpend() );
        this.shipYardView.update();
    }

    this.killFleet = function(id) {
        this.game.shipYard.killFleet(id);
        var turn = this.game.currentTurn();
        $( "#MaintLost" ).html( turn.maintLost() );
        this.shipKilledView.update();
    }

    this.addFleet = function(id) {
        this.game.shipYard.addFleet(id);
        var turn = this.game.currentTurn();
        $( "#ShipSpend" ).html( turn.shipSpend() );
        $( "#PopUp #Content #Tables #FleetTable" ).remove();
        $( "#PopUp #Content #Tables " ).prepend( this.shipYardView.fleetTable() );
        this.shipYardView.update();
    }
}

SE4X.TechTreeView = function(techTree) {
    this.techTree = techTree;

    this.techTable = function() {
        var html = '<table class="pure-table" id="TechTable">';

        html += SE4X.tableHeader([ 'name', 'level', 'cost', '', '' ]);

        this.techTree.techs.map(function(tech) {
            html += '<tr id="{0}">'.format(tech.id);
            html += '<td>{0}</td>'.format(tech.name);
            html += '<td id="TechLevel"></td>';
            html += '<td id="TechCost"></td>';
            html += '<td><button class="pure-button" id="IncrTech" onclick="SE4X.view.incrTech(\'{0}\')">+</button></td>'.format(tech.id);
            html += '<td><button class="pure-button" id="DecrTech" onclick="SE4X.view.decrTech(\'{0}\')">-</button></td>'.format(tech.id);
            html += '</tr>';
        });
        html += '</table>';
        return html;
    }

    this.update = function() {
        this.techTree.techs.map(function(tech) {
            $( "#" + tech.id + " #TechLevel" ).first().html( tech.totalLevel() );
            $( "#" + tech.id + " #TechCost" ).first().html( tech.upgradeCost() );
            $( "#" + tech.id + " #IncrTech" ).attr( "disabled", tech.canIncrTech() ? null : "disabled" );
            $( "#" + tech.id + " #DecrTech" ).attr( "disabled", tech.canDecrTech() ? null : "disabled" );
        });
    }
}

SE4X.ShipKilledView = function(shipYard) {
    this.shipYard = shipYard;

    this.fleetTable = function() {
        var html = '<table class="pure-table" id="FleetTable">';

        html += SE4X.tableHeader([ 'counter', 'number', 'killed', '' ]);

        this.shipYard.fleets.map(function(fleet) {
            html += '<tr id="{0}">'.format(fleet.id);
            html += '<td>{0}</td>'.format(fleet.counter());
            html += '<td id="FleetCount"></td>';
            html += '<td id="FleetKilled"></td>';
            html += '<td><button class="pure-button" id="KillFleet" onclick="SE4X.view.killFleet(\'{0}\')">Kill</button></td>'.format(fleet.id);
            html += '</tr>';
        });
        html += '</table>';
        return html;
    }

    this.update = function() {
        this.shipYard.fleets.map(function(fleet) {
            $( "#" + fleet.id + " #FleetCount" ).first().html( fleet.count );
            $( "#" + fleet.id + " #FleetKilled" ).first().html( fleet.killed );
            $( "#" + fleet.id + " #KillFleet" ).attr( "disabled", fleet.canKillFleet() ? null : "disabled" );
        });
    }
}

SE4X.ShipYardView = function(shipYard) {
    this.shipYard = shipYard;

    this.fleetTable = function() {
        var html = '<table class="pure-table" id="FleetTable">';

        html += SE4X.tableHeader([ 'counter', 'number', 'maintenance', '', '' ]);

        this.shipYard.fleets.map(function(fleet) {
            html += '<tr id="{0}">'.format(fleet.id);
            html += '<td>{0}</td>'.format(fleet.counter());
            html += '<td id="FleetCount"></td>';
            html += '<td id="FleetMaint"></td>';
            html += '<td><button class="pure-button" id="IncrFleet" onclick="SE4X.view.incrFleet(\'{0}\')">+</button></td>'.format(fleet.id);
            html += '<td><button class="pure-button" id="DecrFleet" onclick="SE4X.view.decrFleet(\'{0}\')">-</button></td>'.format(fleet.id);
            html += '</tr>';
        });
        html += '</table>';
        return html;
    }

    this.shipTable = function() {
        var html = '<table class="pure-table" id="ShipTable">';

        html += SE4X.tableHeader([ 'type', 'name', 'cost', 'attack', 'defense', 'hull', 'maint', '' ]);

        this.shipYard.ships.map(function(ship) {
            html += '<tr id="{0}">'.format(ship.id);
            html += '<td>{0}</td>'.format(ship.type);
            html += '<td>{0}</td>'.format(ship.name);
            html += '<td>{0}</td>'.format(ship.cost);
            html += '<td>{0}</td>'.format(ship.attack);
            html += '<td>{0}</td>'.format(ship.defense);
            html += '<td>{0}</td>'.format(ship.hull);
            html += '<td>{0}</td>'.format(ship.maint);
            html += '<td><button class="pure-button" id="AddFleet" onclick="SE4X.view.addFleet(\'{0}\')">Add Fleet</button></td>'.format(ship.id);
            html += '</tr>';
        });
        html += '</table>';
        return html;
    }

    this.update = function() {
        this.shipYard.fleets.map(function(fleet) {
            $( "#" + fleet.id + " #FleetCount" ).first().html( fleet.count + fleet.purchased );
            $( "#" + fleet.id + " #FleetMaint" ).first().html( fleet.currentMaint() + fleet.purchaseMaint() );
            $( "#" + fleet.id + " #IncrFleet" ).attr( "disabled", fleet.canIncrFleet() ? null : "disabled" );
            $( "#" + fleet.id + " #DecrFleet" ).attr( "disabled", fleet.canDecrFleet() ? null : "disabled" );
        });
    }
}
