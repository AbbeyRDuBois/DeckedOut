// entry-view.ts
export class EntryView {
  getUsername(): string {
    return (document.getElementById("username") as HTMLInputElement).value;
  }

  getRoomId(): string {
    return (document.getElementById("roomId") as HTMLInputElement).value;
  }

  hideSignIn() {
    document.getElementById("signInBtn")!.style.display = "none";
  }

  setUsername(name: string) {
    (document.getElementById("username") as HTMLInputElement).value = name;
  }

  showError(message: string) {
    alert(message);
  }

  bindCreateRoom(handler: (gameType: string) => void) {
    document.querySelectorAll<HTMLButtonElement>(".create-room-btn")
      .forEach(btn => {
        btn.addEventListener("click", () => {
          const gameType = btn.dataset.gameType;
          if (gameType) handler(gameType);
        });
      });
  }

  bindJoinRoom(handler: () => void) {
    document.getElementById("joinBtn")!
      .addEventListener("click", handler);
  }

  bindSignIn(handler: () => void) {
    document.getElementById("signInBtn")!
      .addEventListener("click", handler);
  }

  navigateToRoom(roomId: string, gameType: string) {
    window.location.href = `room.html?roomId=${roomId}&game=${gameType}`;
  }
}
