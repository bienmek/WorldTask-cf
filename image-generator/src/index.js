const canvas = document.createElement('canvas');
canvas.width = 1080;
canvas.height = 1080;

const ctx = canvas.getContext('2d');
ctx.fillStyle = 'white';
ctx.fillRect(0, 0, 1080, 1080);

ctx.font = '105px Oxygen';
ctx.textAlign = 'center';
ctx.fillStyle = '#25995C';
ctx.fillText('Weekly ranking...', 540, 100);

const image = new Image();
image.src = canvas.toDataURL();
document.body.appendChild(image);

