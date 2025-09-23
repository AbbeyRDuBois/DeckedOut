# DeckedOut
Website created using HTML/CSS/TS that allows multiplayer card games like Cribbage, Uno, and CAH.


To deploy site for self:
    Do npm run build
    Do firebase deploy
    ctr f5 to do a hard reload to ensure changes make it to website

How to create a custom theme:
    1. Add in a new body[data-theme='Your Theme'] with your desired colors to styles.css.
    2. In shared-ui.html, add in your theme option to the drop down. (Make sure the value matches the name you put for data-theme)

    