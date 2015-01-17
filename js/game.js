/*
Creator: Dragon Prince
Date: 23.10.2011
Time:08:02 PM
*/
var canvas;
var prince;
var width=600;
var height=600;

var totalAliens= 6;
var select= 0;
var aliens= [];
var alien_x= 50;
var alien_y= 50;
var alien_w= 50;
var alien_h= 50;
var speed= 3;

var rightKey= false;
var leftKey= false;
var upKey= false;
var downKey= false;

var player_x= width/2;
var player_y= height-50;
var player_w=50;
var player_h=50;

var fire= [];
var fire_total= 5;//total nos of onscreen fire

var score= 0;
var temp=0;

alive=true;

for (var i=0; i<totalAliens; i++)
{
//we add the aliens co ordinate n speed to de array
aliens.push([alien_x, alien_y, alien_w, alien_h, speed]);
alien_x= alien_x+alien_w+50;//distance between each aliens
}

function clrCanvas()
{
prince.clearRect(0, 0, width, height);
}

function drawAliens()
{
for( var i=0; i<aliens.length; i++)
{
switch (select)
{
case 0:
prince.drawImage(alien, aliens[i][0], aliens[i][1]);
break;

case 1:
prince.drawImage(alien2, aliens[i][0], aliens[i][1]);
break;

case 2:
prince.drawImage(alien3, aliens[i][0], aliens[i][1]);
break;

case 3:
prince.drawImage(alien4, aliens[i][0], aliens[i][1]);
break;

case 4:
prince.drawImage(alien5, aliens[i][0], aliens[i][1]);
break;
}
}
}

function player()
{
//define movements
if (rightKey)
player_x+= 5;
else if (leftKey)
player_x-= 5;

if (upKey)
player_y-= 5;
else if (downKey)
player_y+= 5;

//prevent the player from goin beyond focus
if (player_x < 0)
player_x=0;//left wall

if((player_x+player_w) >= width)
player_x=width-player_w;//right wall

if(player_y < 0)
player_y=0;//top wall

if((player_y+player_h) >= height)
player_y= height-player_h;//bottom wall

//draw the player
prince.drawImage(player_ship, player_x, player_y);
}

function moveAliens()
{
for (var i=0; i < aliens.length; i++)
{
if(aliens[i][1] < height)
{
//aliens[i][4] = Math.floor(Math.random() * 10) + 3;
aliens[i][1] += aliens[i][4];//add with speed
}
else if (aliens[i][1] > height-1)//from de top again
{
aliens[i][1]= -45;
aliens[i][0]= (Math.random() * 500) + 1 ;
}
}
}

function drawFire()
{
for (var i = 0; i < fire.length; i++)
prince.drawImage(ray, fire[i][0], fire[i][1]);
}

function moveFire()
{
for (var i = 0; i < fire.length; i++)
{
if (fire[i][1] > -26)
fire[i][1] -=10;
else if (fire[i][1] < -25)
fire.splice(i, 1);//goes beyond screen so remove it
}
}

function hit()
{
var remove= false;
for (var i= 0; i< fire.length; i++)
{
for (var j= 0; j< aliens.length; j++)
{
//x cordinate of fire should be greater than alien's x cordinate and lesser than (alien's x cordinate + alien's width) to make contact
// y cordinate of de fire must be within the aliens y cordinate and height
if(((fire[i][0] >= aliens[j][0]) && (fire[i][0] <= (aliens[j][0] + aliens[j][2]))) && (fire[i][1] <= (aliens[j][1] + aliens[j][3])))
{
remove= true;
aliens.splice(j,1);
aliens.push([(Math.random() * 500) + 1, 50, alien_w, alien_h, speed]);
score += 10;
temp += 10;
}
}
if (remove == true)
{
fire.splice(i,1);
remove= false;
}
}
}

function die()
{
var player_width= player_x + player_w;
var player_height=player_y + player_h;
for( var i=0; i< aliens.length; i++)
{
if(player_x > aliens[i][0] && player_x < aliens[i][0] + alien_w && player_y > aliens[i][1] && player_y < aliens[i][1] + alien_h) //checks de bottom left most corner
{
alive = false;
prince.drawImage(blast, player_x, player_y);
player_ship.splice(player_x, player_y);
}

if (player_width < aliens[i][0] + alien_w && player_width > aliens[i][0] && player_y > aliens[i][1] && player_y < aliens[i][1] + alien_h) //checks de bottom right most corner
{
alive = false;
prince.drawImage(blast, player_x, player_y);
player_ship.splice(player_x, player_y);
}

if (player_height > aliens[i][1] && player_height < aliens[i][1] + alien_h && player_x > aliens[i][0] && player_x < aliens[i][0] + alien_w) //checks the top left most corner
{
alive = false;
prince.drawImage(blast, player_x, player_y);
player_ship.splice(player_x, player_y);
}

if (player_height > aliens[i][1] && player_height < aliens[i][1] + alien_h && player_width < aliens[i][0] + alien_w && player_width > aliens[i][0]) //checks the top right most corner
{
alive = false;
prince.drawImage(blast, player_x, player_y);
player_ship.splice(player_x, player_y);
}

}
}


function scoreDisplay() 
{
prince.font = 'bold 21px Time';
prince.fillStyle = '#fff';
prince.fillText('Score: ', 490, 30);
prince.fillText(score, 550, 30);
if (!alive) {
prince.fillText('Your dead buddy', 245, height / 2);
}
if(temp >= 100 && temp <= 200)
{
select= 1;
speed=4;
}
if(temp >= 200 && temp <= 300)
{
select= 2;
speed=5;
}
if(temp >= 300 && temp <= 400)
{
select= 3;
speed=6;
}
if(temp >= 400 && temp <= 500)
{
select= 4;
speed=7;
}
if(temp >= 500 && temp <= 600)
{
speed=8;
select= 0;
temp= 0;
}
}

function init()
{
canvas= document.getElementById('canvas');
prince= canvas.getContext('2d');
alien= new Image();
alien.src= "images/red.png";
alien2= new Image();
alien2.src= "images/white.png";
alien3= new Image();
alien3.src= "images/blue.png";
alien4= new Image();
alien4.src= "images/bug.png";
alien5= new Image();
alien5.src= "images/eye.png";
player_ship= new Image();
player_ship.src= "images/ship.png";
ray= new Image();
ray.src= "images/ray.png";
blast= new Image();
blast.src= "images/blast.png";
setInterval( gameLoop, 25);//frames per millisec
document.addEventListener('keydown', A, false);
document.addEventListener('keyup', B, false);
}

function gameLoop()
{
clrCanvas();
if (alive)
{
hit();
die();
moveAliens();
drawAliens();
player();
drawFire();
moveFire();
}
scoreDisplay();
}

function A(a)
{
if (a.keyCode == 39)
rightKey= true;
else if(a.keyCode == 37)
leftKey= true;

if (a.keyCode == 38)
upKey= true;
else if(a.keyCode == 40)
downKey= true;

if (a.keyCode == 32 && fire.length <= fire_total)
fire.push([player_x + 23, player_y - 25]);

}

function B(a)
{
if (a.keyCode == 39)
rightKey= false;
else if(a.keyCode == 37)
leftKey= false;

if (a.keyCode == 38)
upKey= false;
else if(a.keyCode == 40)
downKey= false;
}

window.onload= init;


























