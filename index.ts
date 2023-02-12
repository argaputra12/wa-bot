import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    downloadMediaMessage,
    Browsers
  } from '@adiwajshing/baileys';
import { Boom } from '@hapi/boom';

import sharp from 'sharp';

import fs from 'fs';
import { writeFile } from 'fs/promises'

export const connect = async () => {
const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
const socket = makeWASocket({
    printQRInTerminal: true,
    auth: state,
    browser: Browsers.macOS("Desktop")
});

socket.ev.on('creds.update', async () => {
    await saveCreds();
});
socket.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    switch (connection) {
        case 'close':
            const shouldReconnect =
            (lastDisconnect?.error as Boom)?.output?.statusCode !==
            DisconnectReason.loggedOut;
            console.log('🔴 Disconnected: ', lastDisconnect?.error);
            if (shouldReconnect) {
            connect();
            }
            break;

        case 'connecting':
            console.log('🟡 Connecting');
            break;

        case 'open':
            console.log('🟢 Connected');
            break;

        default:
            break;
    }
    if (connection === 'close') {
    // const shouldReconnect =
    //   (lastDisconnect.error as Boom)?.output?.statusCode !==
    //   DisconnectReason.loggedOut;
    // console.log(
    //   'connection closed due to ',
    //   lastDisconnect.error,
    //   ', reconnecting ',
    //   shouldReconnect
    // );
    // // reconnect if not logged out
    // if (shouldReconnect) {
    //   connectToWhatsApp();
    // }
    console.log('connection closed due to ', lastDisconnect?.error);
    } else if (connection === 'open') {
    console.log('opened connection');
    }
});
socket.ev.on('messages.upsert', async ({ messages, type }) => {
    const m = messages[0];
    
    if(!m.message) return;
    if (type !== 'notify') return;
        console.log(JSON.stringify(messages));
        const sender = messages[0].key.remoteJid;
    if (messages[0].key.fromMe) {
        console.log('ignoring message from self');
        return;
    }
        console.log('replying to', sender);
    if (sender) {
        // if message type is image
        switch(Object.keys(m.message)[0]){
            case("imageMessage"):
                const buffer = await downloadMediaMessage(
                    m,
                    "buffer",
                    {},
                );
                
                // delete output.webp if exists
                let filedir = "./images/output.webp";
                if(fs.existsSync(filedir)){
                    fs.unlinkSync(filedir);
                }
                
                // image processing
                await sharp(buffer)
                    .resize(512, 512)
                    .webp()
                    .toFile(filedir)
                    .then(() =>{
                        console.log("Image processed");

                        fs.existsSync(filedir) ? console.log("file exists") : console.log("file does not exist");

                        socket.sendMessage(sender, {
                            sticker: fs.readFileSync(filedir),
                        });
                    })

            break;

            default:
                socket.sendMessage(sender, {
                    text: "I'm a bot",
                })
            break;
        }
    }
});
};

connect();