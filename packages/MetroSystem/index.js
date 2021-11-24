class MetroSystem 
{
  ticketPrice = 350;
  routes = null;

  static initialize = function() {
    this.routes = [
      new MetroRoute(1, [
        new MetroStation(1, "LSIA Terminal", new mp.Vector3(-1089.08, -2722.46, -8), new mp.Vector3(-1080.33, -2723.51, -9.42), new mp.Vector3(-1091.47, -2713.67, -9.42)),
        new MetroStation(2, "LSIA Parking", new mp.Vector3(-871.58, -2292.60, -12), new mp.Vector3(-867.76, -2297.91, -13.75), new mp.Vector3(-882.04, -2292.92, -13.75)),
        new MetroStation(3, "Puerto Del Sol", new mp.Vector3(-534.58, -1272.25, 27), new mp.Vector3(-533.88, -1279.40, 24.78), new mp.Vector3(-542.53, -1275.31, 24.78)),
        new MetroStation(4, "Strawberry", new mp.Vector3(278.71, -1205.81, 38), new mp.Vector3(277.61, -1210.10, 36.95), new mp.Vector3(279.32, -1198.60, 36.95)),
        new MetroStation(5, "Burton", new mp.Vector3(-291.53, -318.96, 9), new mp.Vector3(-287.01, -319.07, 8.06), new mp.Vector3(-302.09, -318.65, 8.06)),
        new MetroStation(6, "Portola Drive", new mp.Vector3(-817.60, -139.27, 19), new mp.Vector3(-818.40, -130.52, 17.93), new mp.Vector3(-810.50, -143.64, 17.93)),
        new MetroStation(7, "Del Perro", new mp.Vector3(-1350.61, -466.92, 14), new mp.Vector3(-1358.88, -466.93, 13.03), new mp.Vector3(-1345.65, -459.87, 13.03)),
        new MetroStation(8, "Little Seoul", new mp.Vector3(-498.40, -673.42, 11), new mp.Vector3(-502.36, -680.68, 9.79), new mp.Vector3(-502.59, -665.63, 9.79)),
        new MetroStation(9, "Pillbox South", new mp.Vector3(-213.49, -1030.22, 29), new mp.Vector3(-217.25, -1030.57, 28.20), new mp.Vector3(-208.98, -1035.07, 28.20)),
        new MetroStation(10, "Davis", new mp.Vector3(111.75, -1724.17, 29), new mp.Vector3(111.31, -1727.83, 27.93), new mp.Vector3(118.89, -1723.10, 28))
      ])
    ]
	
	console.log("[INFO] MetroSystem successful initialized");
	
	mp.events.add("playerJoin", this.playerJoin);
	mp.events.add("metro::race_finish", this.finishRace);
	mp.events.add("metro::buy_ticket", this.buyTicket)
	mp.events.add("metro::interaction_pressed", this.interactionPressed)
	
	mp.events.add("playerEnterColshape", (player, shape) => {
	  console.log(`${player.name} enter shape`);
	  if (shape && shape.metroStation) {
		player.metroStation = shape.metroStation;
		player.call("metro::is_area_shape", [true]);
	  }
	})
	mp.events.add("playerExitColshape", (player, shape) => {
	  console.log(`${player.name} exit shape`);
	  if (shape && shape.metroStation) {
		if (player.metroStation) {
		  delete player.metroStation;
		  player.call("metro::is_area_shape", [false])
		}
	  }
	})
  }

  static playerJoin = function (player) {
	console.log(`Player ${player.name} joined the server`);
	player.position = new mp.Vector3(-1089.08, -2722.46, -6);
	player.dimension = 0;
	player.money = 10000;
  }

  static interactionPressed = function (player) {
    // check login user
	console.log("interaction pressed");
    if (player.metroStation) {
		console.log("interaction pressed 2");
      const station = player.metroStation;
      const route = MetroSystem.routes.find(x => x.stations.some(s => s === station));
      if (route) {
		  console.log(route.toJson());
        player.call("metro::open_menu", [MetroSystem.ticketPrice, station.id, route.id, route.toJson()])
      }
    }
  }

  static buyTicket = function (player, stationId) {
    // check login user

    if (player.metroStation) {
      const currentStation = player.metroStation;
      const route = MetroSystem.routes.find(x => x.stations.some(s => s === currentStation));

      if (player.money >= MetroSystem.ticketPrice || true) {
        if (currentStation.id == stationId){
          player.notify("Вы уже находитесь на данной станции");
          return;
        }
        
        const arriavalOfStation = route.stations.find(x => x.id === stationId);
        if (arriavalOfStation) {
          let aIndex = route.stations.findIndex(x => x === currentStation);
          let wIndex = route.stations.findIndex(x => x === arriavalOfStation);

          currentStation.spawnTrain(player, arriavalOfStation, aIndex > wIndex);
		  player.money -= MetroSystem.ticketPrice;
		  console.log(`${player.name} balance = ${player.money}`);
          // change player balance
        }
      }
      else {
        player.notify("У недостаточно средств");
      }
    }
  }

  static finishRace = function (player) {
    player.dimension = 0;
  }
  
}

class MetroRoute 
{
  id = -1;
  stations = null;

  constructor(_id, _stations) {
    this.id = _id;
    this.stations = _stations;
  }
  
  toJson = function () {
    let arr = [];
	
	for (let i = 0; i < this.stations.length; i++) {
		let data = {
			Id: this.stations[i].id,
			Name: this.stations[i].name,
		}
		arr.push(data);
	}

    return JSON.stringify(arr);
  }
}

class MetroStation
{
  id = -1;
  name = null;
  position = null;
  trainSpawnPositions = null;

  blip = null
  shape = null;
  marker = null;

  constructor(_id, _name, _position, _oneSpawnPosition, _twoSpawnPosition) {
    this.id = _id;
    this.name = _name;
    this.position = _position;
    this.trainSpawnPositions = [_oneSpawnPosition, _twoSpawnPosition];

    this.createGTAElements();
  }

  spawnTrain = function (player, arrivalStation, forward) {
    const privateDimension = player.id + 11;
    const spawnTrainPosition = this.getTrainSpawnPositionWithForwardMove(forward);
    const pointOfArrival = arrivalStation.getTrainSpawnPositionWithForwardMove(forward);

    player.dimension = privateDimension;
    player.call("metro::start_race", [spawnTrainPosition, pointOfArrival, arrivalStation.position, privateDimension])
  }

  getTrainSpawnPositionWithForwardMove = function (forward) {
    let index = forward ? 1 : 0;
    if (index >= 0 && index < this.trainSpawnPositions.length)
      return this.trainSpawnPositions[index];
    else
      return this.position;
  }

  createGTAElements = function () {
    this.blip = mp.blips.new(795, this.position, {
      name: this.name,
      scale: 0.5,
      color: 47,
      alpha: 255,
      drawDistance: 0,
      shortRange: true,
      rotation: 0,
      dimension: 0
    });
    this.marker = mp.markers.new(1, this.position, 2, {
      direction: new mp.Vector3(0, 0, 0),
      rotation: new mp.Vector3(0, 0, 0),
      color: [120, 50, 120, 135],
      visible: true,
      dimension: 0
    });
	const { x, y, z } = this.position;
    this.shape = mp.colshapes.newTube(x, y, z, 2, 2)
    this.shape.metroStation = this;
	
	console.log(`${this.shape.metroStation.name}`);
  }
}

MetroSystem.initialize();