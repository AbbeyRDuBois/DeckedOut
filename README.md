# DeckedOut
Website created using HTML/CSS/TS that allows multiplayer card games like Cribbage, Uno, and CAH.

Related to a [Discord bot](https://github.com/321pie/Card_Bot) that performs a similar function over Discord. This program aims to provide a more customizable experience.

## How To Create a Custom Theme

1. Add in a new body[data-theme='Your Theme'] with your desired colors to `styles.css`.

2. In `shared-ui.html`, add in your theme option to the drop down. (Make sure the value matches the name you put for data-theme)

## How to Create a Custom Card Theme

1. Create The Sprite sheet
    - Make sure each suit is in it's own line and ordered. Jokers/Card back are the last row.
    - Order for the suits from top to bottom are Club, Diamond, Heart, Spade. (Use existing as reference)
    - My method: Create cards in slides/ppt export it as png's then use [this](https://kuut.xyzspritesheet) to create the sprite sheet. (make sure it has transparent background)
2. Add Sprite sheet class
    1. Go to `spritesheets.ts`
    2. import your image to the file
    3. Create a new class extending SpriteSheet class
        - Set the image member to your import value
        - Set sheet-height to your sprite sheet height
        - set card-width and card-height to what you made your card width/height to be
        - Currently there is a gap auto set between the cards, adjust to your liking/set it to 0 if you don't need it
        - If you have fancy options like pokemon with random deck chance, you can set special image select functionality if desired as well.
3. In `shared-ui.html`, add in your theme option to the `card-theme-selector` drop down.
4. In `base-game.ts`, add in your theme as a case in `setSpriteSheet()`. (Make sure your case matches the value you put in the selector)

## How To Deploy

1. Download [npm](https://nodejs.org/en/download) and run through setup until completed.

2. Open a new terminal and run the following commands:
```
npm install firebase@^10.0.0 firebaseui
```
```
npm install -g firebase-tools
```
```
npm install firebaseui --save
```
 
> **NOTE**: If scripts are disabled on your system, you can run the following command in your terminal to enable them:
> ```
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

3. Create a folder in the root directory called `dist`. This folder will be used to store the deployed code.

4. Open a new terminal and run the following commands, following any on-screen prompts. The URL for the deployed code will be displayed as the "Hosting URL" in the terminal after the final command.
```
firebase login
```
```
npm run build
```
```
firebase deploy --only hosting
```

> For future deployment, simply run the following commands:
> ```
> npm run build
> ```
> ```
> firebase deploy --only hosting
> ```
> 
> If the website is already open in your browser, use `ctrl+R` or `f5` to do a hard reload and ensure that all deployed changes are loaded.