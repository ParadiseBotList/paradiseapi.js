# paradiseapi.js
An official NPM module for interacting with the  Paradise API

## Installation
`npm install ` - Coming Soon

Backup Method: 
Add this to your package.json
```
    "paradiseapi.js": "https://github.com/ParadiseBotList/paradiseapi.js",
```

• Save and profit

## Documentation
• [Paradise Docs](https://help.paradisebots.net)

## Example

### Example of posting server count with supported libraries (Discord.js and Eris)
```js
const Discord = require("discord.js");
const client = new Discord.Client();
const PARADISE = require("paradiseapi.js");
const paradise = new PARADISE('Your Paradise API Token', client);

// Optional events
paradise.on('posted', () => {
  console.log('Server count posted!');
})

paradise.on('error', e => {
 console.log(`Oops! ${e}`);
})
```
