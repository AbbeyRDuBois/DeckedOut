/****************************************************************************
 * 
 *  Entry Controller of DeckedOut
 * 
 *      Handles the entry events like joining and hosting a room
 * 
 ****************************************************************************/

import { EntryModel } from "./entry-model";
import { EntryView } from "./entry-view";
import { signInWithGoogle } from "../services/authentication";

export class EntryController {
  constructor(
    private model: EntryModel,
    private view: EntryView
  ) {}

  ///Binds all the buttons in view with their functionality
  init() {
    this.view.bindCreateRoom(this.handleCreateRoom);
    this.view.bindJoinRoom(this.handleJoinRoom);
    this.view.bindSignIn(this.handleSignIn);
  }

  private handleCreateRoom = async (gameType: string) => {
    const username = this.view.getUsername();
    if (!username) {
      this.view.showError("Please enter your host name.");
      return;
    }

    try {
      const roomId = await this.model.createRoom(gameType, username);
      this.view.navigateToRoom(roomId, gameType);
    } catch {
      this.view.showError("Failed to create room.");
    }
  };

  private handleJoinRoom = async () => {
    const roomId = this.view.getRoomId();
    const username = this.view.getUsername();

    if (!roomId || !username) {
      this.view.showError("Please fill in all fields.");
      return;
    }

    if (username.length > 15) {
      this.view.showError("Username too long.");
      return;
    }

    const gameType = await this.model.joinRoom(roomId, username);
    this.view.navigateToRoom(roomId, gameType);
  };

  private handleSignIn = async () => {
    const [, name] = await signInWithGoogle();
    this.view.setUsername(String(name));
    this.view.hideSignIn();
  };
}