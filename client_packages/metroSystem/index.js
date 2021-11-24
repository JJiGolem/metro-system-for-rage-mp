const localplayer = mp.players.local;
const MNatives = {
  SetEntityAsMissionEntity: "0xAD738C3085FE7E11",
  SetTrainCruiseSpeed: "0x16469284DB8C62B5",
  SetTrainSpeed: "0xAA0BC91BE0B796E3",
  SetMissionTrainCoords: "0x591CA673AA6AB736",
  GetEntityCoords: "0x3FEF770D40960D5A",
  DeleteAllTrains: "0x736A718577F39C7D",
  GetTrainCarriage: "0x08AAFD0814722BC3",
  SetCamViewMode: "0x5A4F9EDF1673F704"
}

let browser = null;
let train = null;
let trainSpeed = 0;
let trainStoped = false;
let pointShape = null;
let playerPosition = null;
let lastCamViewMode = 0;

function createBrowser(ticketPrice, currentStationId, routeId, stations) {
  deleteBrowser();
  browser = mp.browsers.new('package://MetroSystem/browser/index.html');
  mp.gui.cursor.show(true, true);
  mp.gui.chat.push(stations);
  browser.execute(`Metro.open(${ticketPrice}, ${currentStationId}, ${routeId}, ${stations})`);
}

function deleteBrowser() {
  if (browser) {
    browser.destroy();
    browser = null;
  }
  mp.gui.cursor.show(false, false);
}

async function createTrain(position) {
  const trainHash = mp.game.joaat("metrotrain");
  mp.game.streaming.requestModel(trainHash);

  while (!mp.game.streaming.hasModelLoaded(trainHash)) {
    await mp.game.waitAsync(0);
  }

  train = mp.game.vehicle.createMissionTrain(25, position.x, position.y, position.z, true);
  
  if (!train || train == 0 || train == 25) {
	train = mp.game.vehicle.createMissionTrain(24, position.x, position.y, position.z, true);
  }

  mp.game.invoke(MNatives.SetTrainSpeed, train, 0);
  mp.game.invoke(MNatives.SetTrainCruiseSpeed, train, 0);
  mp.game.invoke(MNatives.SetEntityAsMissionEntity, train, true, true);
}

function startTrainMovement(pointPosition) {
  trainSpeed = 21.1;
  trainStoped = false;

  var moveInterval = setInterval(() => {
    if (!train) {
      clearInterval(moveInterval);
      moveInterval = false;
      return;
    }

    const trainPosition = mp.game.invokeVector3(MNatives.GetEntityCoords, train, false);
    let dist = mp.game.gameplay.getDistanceBetweenCoords(trainPosition.x, trainPosition.y, trainPosition.z, pointPosition.x, pointPosition.y, pointPosition.z, true);

    if (trainStoped) {
      trainSpeed = 0;
    }
    else if (dist < 100) {
      trainSpeed = 12.1;
    }
    else if (dist < 75) {
      trainSpeed = 8.1;
    }
    else if (dist < 20) {
      trainSpeed = 0;
    }

    mp.game.invoke(MNatives.SetTrainCruiseSpeed, train, trainSpeed);

  }, 1000)

}

function createPoint(pointPosition, privateDimension) {
  pointShape = mp.colshapes.newTube(pointPosition.x, pointPosition.y, pointPosition.z, 10, 30, privateDimension);
}

async function blackOutScreen(fadeOut, fadeIn, duration) {
  mp.game.cam.doScreenFadeOut(fadeOut);
  await mp.game.waitAsync(duration);

  while (localplayer.isInAnyVehicle(false) == false || localplayer.getVehicleIsIn(false) != train) {
    localplayer.setIntoVehicle(train, 0);
    await mp.game.waitAsync(1);
  }

  mp.game.cam.doScreenFadeIn(fadeIn);
}

let isCanPressE = false;
mp.events.add("metro::is_area_shape", (state) => {
  isCanPressE = state;
  mp.gui.chat.push("IS_AREA_SHAPE = " + state);
})
mp.keys.bind(0x45, false, () => {
  if (isCanPressE && browser == null) {
    mp.events.callRemote("metro::interaction_pressed");
	mp.gui.chat.push("Intersection pressed");
  }
  
  mp.gui.chat.push("PressKey E");
})

mp.events.add('metro::open_menu', createBrowser);
mp.events.add('metro::close_menu', deleteBrowser);

mp.events.add('metro::buy_ticket_trigger', (stationId) => {
  if (browser != null) {
    deleteBrowser()
    mp.events.callRemote("metro::buy_ticket", stationId);
  }
});


mp.events.add("metro::start_race", async (trainSpawnPosition, pointPosition, playerSpawnPosition, privateDimension) => {
  await createTrain(trainSpawnPosition);

  lastCamViewMode = mp.game.invoke("0x8D4D46230B2C353A");
  mp.game.invoke("0x5A4F9EDF1673F704", 4);

  await blackOutScreen(500, 1500, 1000);

  playerPosition = playerSpawnPosition;
  createPoint(pointPosition, privateDimension);
  startTrainMovement(pointPosition);
  mp.events.call("showHUD", false);
})

mp.events.add("playerEnterColshape", async (enterShape) => {
  if (train && pointShape && pointShape === enterShape) {
    trainStoped = true;

    while (mp.game.invokeFloat("0xD5037BA82E12416F", train) > 0) {
      await mp.game.waitAsync(1);
    }
    await mp.game.waitAsync(1000);
    await blackOutScreen(500, 2000, 1000);
    localplayer.position = playerPosition;
    
    mp.game.vehicle.deleteMissionTrain(train);

    pointShape.destroy();

    pointShape = null;
    playerPosition = null;
    train = null;
    trainStoped = false;
    
    await mp.game.waitAsync(100);
    mp.game.invoke("0x5A4F9EDF1673F704", lastCamViewMode);
    mp.events.callRemote("metro::race_finish");
  }
});

mp.events.add("playerQuit", (player) => {
  if (player == localplayer && train && pointShape) {
    pointShape.destroy();
    mp.game.vehicle.deleteMissionTrain(train);
    mp.game.invoke("0x5A4F9EDF1673F704", lastCamViewMode);
  }
});

mp.events.add("render", () => {
	if (train && pointShape && !trainStoped) {
    mp.game.controls.disableAllControlActions(0);
    mp.game.controls.disableAllControlActions(1);
    mp.game.controls.disableAllControlActions(3);
    mp.game.controls.disableAllControlActions(4);
    mp.game.controls.disableAllControlActions(5);
    mp.game.controls.disableAllControlActions(9);
    mp.game.controls.disableAllControlActions(10);
    mp.game.controls.disableAllControlActions(11);
    mp.game.controls.disableAllControlActions(12);
    mp.game.controls.disableAllControlActions(13);
    mp.game.controls.disableAllControlActions(14);
    mp.game.controls.disableAllControlActions(15);
    mp.game.controls.disableAllControlActions(16);
    mp.game.controls.disableAllControlActions(20);
    mp.game.controls.disableAllControlActions(21);
  }
})
