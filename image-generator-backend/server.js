const {registerFont, createCanvas, loadImage} = require('canvas');
const admin = require("firebase-admin");
const serviceAccount = require("./worldtask-test-firebase-adminsdk-shm8g-11fbd876ed.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const generateUUID = () => { // Public Domain/MIT
    let d = new Date().getTime();//Timestamp
    let d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

const roundedImage = (ctx, x, y, width, height, radius) => {
    ctx.save()
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.clip()
}

const generateSharableRankingPicture = async (profilePicture, username, email, stars, rank, contestants) => {
    registerFont('./fonts/intro-script-demo-medium.otf', { family: 'IntroScript' })
    registerFont('./fonts/Oxygen-Regular.ttf', { family: 'Oxygen' })
    registerFont('./fonts/Oxygen-Bold.ttf', { family: 'Oxygen_bold' })
    const star = await loadImage('https://firebasestorage.googleapis.com/v0/b/worldtask-test.appspot.com/o/dev-utils%2Fstar_5.png?alt=media&token=c7aaa00d-7371-484d-a405-4c337a015fa0')
    const logo = await loadImage("https://firebasestorage.googleapis.com/v0/b/worldtask-test.appspot.com/o/dev-utils%2FLogo.png?alt=media&token=bfd14a52-9427-4893-b0a2-8695dec3c659")
    const pfp = await loadImage(profilePicture)

    const canvas = createCanvas(1080, 1080);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 1080, 1080);

    ctx.font = '105px "IntroScript"'
    ctx.textAlign = 'center';
    ctx.fillStyle = '#25995C';

    ctx.fillText('Weekly ranking...', 1080/2, 100)

    ctx.font = '60px "Oxygen"'
    ctx.textAlign = 'center';
    ctx.fillStyle = 'black';

    ctx.fillText('...du nombre d\'', 1080/2, 200)

    ctx.drawImage(star, 745, 120, 110, 110)

    ctx.shadowBlur = 10;
    ctx.shadowColor = '#2a2a2a';
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = 'white';

    ctx.fillRect(22, 369, 1031, 406);

    const width = 300;
    const height = 300;
    const radius = 150
    const x = 0
    const y = 0
    const pfpCanvas = createCanvas(width, height);
    const ctxPfp = pfpCanvas.getContext('2d');

    roundedImage(ctxPfp, x, y, width, height, radius)
    ctxPfp.drawImage(pfp, x, y, width,height);
    ctxPfp.restore()

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'white';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.drawImage(pfpCanvas, 45, 390, 150, 150)

    ctx.font = '76px "Oxygen_bold"'
    ctx.textAlign = 'left';
    ctx.fillStyle = '#25995C';

    ctx.fillText(`@${username}`, 212, 460)

    ctx.font = '35px "Oxygen"'
    ctx.textAlign = 'left';
    ctx.fillStyle = '#959595';

    ctx.fillText(email, 212, 510)

    ctx.font = '126px "Oxygen_bold"'
    ctx.textAlign = 'left';
    ctx.fillStyle =
        rank === 1 ? '#FFC700' :
            rank === 2 ? '#D9D9D9' :
                rank === 3 ? '#905858' :
                    (rank > 3 && rank <= 10) ? '#25995C' : '#959595'

    ctx.fillText(`#${rank}`, 60, 710)

    const rectCanvas = createCanvas(400, 132);
    const ctxRect = rectCanvas.getContext('2d');

    roundedImage(ctxRect, 0, 0, 400, 130, 60)
    ctxRect.fillStyle = 'white';
    ctxRect.fillRect(0,0,400,130);
    ctxRect.restore()

    ctx.shadowBlur = 10;
    ctx.shadowColor = '#2a2a2a';
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    ctx.drawImage(rectCanvas, 620, 600, 400, 132)

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'white';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.drawImage(star, 630, 610, 110, 110)

    ctx.font = '80px "Oxygen_bold"'
    ctx.textAlign = 'right';
    ctx.fillStyle = 'black';

    ctx.fillText(stars, 1000, 699)

    ctx.font = '32px "Oxygen"'
    ctx.textAlign = 'left';
    ctx.fillStyle = 'black';

    ctx.fillText(`sur ${contestants}`, 166, 750)

    ctx.drawImage(logo, 700, 1000, 360, 60)

    return canvas.toBuffer('image/png')
}

const main = async () => {
    const image = await generateSharableRankingPicture("https://firebasestorage.googleapis.com/v0/b/worldtask-test.appspot.com/o/profile_picture%2F5e808ac5-15d3-46ad-8ead-dbabb1fa5b1f?alt=media&token=548b11b6-70d6-4e71-91f0-7676f90386df", "Ugook", "ugo.krollak@isen.yncrea.fr", 1344, 2, 4)
    const fileName = `sharable_ranking_pictures/${generateUUID()}.png`
    const bucket = admin.storage().bucket("gs://worldtask-test.appspot.com/")
    const file = bucket.file(fileName)
    await file.save(image, (error) => {
        if (error) {
            console.error(error);
        } else {
            console.log('File saved.');
        }
    })
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })