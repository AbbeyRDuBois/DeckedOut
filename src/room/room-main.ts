import { CribbageView } from "../cribbage/cribbage-view";
import { RoomController } from "./room-controller";
import { Room } from "./room-model";
import { RoomView } from "./room-view";
import "../styles.css";

const GameViewMap: Record<string, any> = {
    'cribbage': CribbageView
}

//This sets up the main functionality of the rooms on load
window.onload = async () => {
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("roomId");
  const gameType = params.get("game")!;


  const model = new Room(gameType!, roomId!);
  const view = new RoomView(new GameViewMap[gameType]());
  const controller = new RoomController(model, view);

  await view.renderGameContent(gameType)

  await controller.init();
};
