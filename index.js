  const http = require('http');
  const fs = require('fs');
  const path = require('path');
  
  const hostname = 'powerful-shore-55622.herokuapp.com';
  const port = 80;
  
  const server = http.createServer((req, res)=>{
  
      if(req.url === '/'){
  
          
  
          fs.readFile('./start.html','UTF-8', (err, html)=>{
  
              res.statusCode = 200;
              res.setHeader('Content-Type', 'text/html');
              res.end(html);
          });
      }
      
      if(req.url === '/board'){
  
          
  
        fs.readFile('./board.html','UTF-8', (err, html)=>{

            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html');
            res.end(html);
        });
    }
      if(req.url === '/main'){
          
        
        
        
          
  
          fs.readFile('./main.html','UTF-8', (err, html)=>{
  
              res.statusCode = 200;
              res.setHeader('Content-Type', 'text/html');
              res.end(html);
          });
      }
  })
  
  server.listen(port, hostname, ()=>{
      console.log("listening");
  })
  
  var io = require('socket.io').listen(server)
let gameIsStarted = true;


const serverTick  = 1000/60;
const size = 100;
const plan = [
    [
        'xxxxxxxx',
        'x      x',
        'x xx   x',
        'x      x',
        'x      x',
        'x      x',
        'xxxxxxxx'
    ]
]

function Level(plan){
    this.users = [];
    this.massActors = [];
    this.massWalls = [];
    this.massSpots = [];
    this.width = plan[0].length * size;
    this.height = plan.length * size;
    for(let i = 0; i < plan.length; i++){
        let row = plan[i];
        for(let j = 0; j < row.length; j++){
            if(row[j] == "x"){
                this.massWalls.push({
                    pos : new Vector(j * size, i * size),
                    size : new Vector(size, size)
                })
            }
            else{
                this.massSpots.push({
                    pos : new Vector(j * size, i * size),
                    size : new Vector(size, size)
                })
            }
        }
    }
}

let level = new Level(plan[0]);

io.sockets.on('connection', (socket) => {
    
    socket.emit('createCanvas' ,{ data : level});
    console.log(level.users)
    console.log(socket.id)
    
    socket.on("disconnect", () => {
        console.log('disconnected')
        level.users = level.users.filter( elem =>{
           return elem.id != socket.id
        })
    })

    socket.on('getInfoFromPlayer', (data) => {
        level.users = level.users.map((element) => {
            if(element.id === data.id){
                return element.act(data)
            }
            else{
                return element
            }
        });
    })

    socket.on('playerReady',(data) => {
        console.log(data);
        if(level.users.length < 20){
            io.sockets.emit('updateChat' , { data : 'игрок ' + data.data.nik + ' присоединился'})
            let randomSpot = level.massSpots[Math.floor(Math.random() * level.massSpots.length)];
            let newUser = new Player(socket.id,  randomSpot.pos.x + 50, randomSpot.pos.y + 50, data.data.nik,data.data.color)
            level.users.push(newUser)
        }
        
    })
    
    socket.on('addMessage',(data) => {
        let nik = level.users.filter( elem => {
            return data.id === elem.id
        })[0]
        if(nik){
            io.sockets.emit('updateChat' ,{ data : data.value, nik : nik.nickname, color : nik.color})
        }
        else{
            io.sockets.emit('updateChat' ,{ data : data.value, nik : "Зритель", color : 'black'})
        }
        
    })
    
    setInterval(()=>{  
        if(!checkWinner()){
            io.sockets.emit("draw", {data : level});
        }
        else{            
            io.sockets.emit("loadScoreBoard", {data : level})
        }  

    },1000/60)

})

function checkWinner(){
    let winner = undefined;
    level.users.forEach((elem, id) => {
        if(elem.poits >= 2){
            winner = true;
        }
    })
    if(winner){
        return true;
    }
    else{
        return false;
    }
}

function Player(id, x, y, nik, color){
    this.poits = 0;
    this.color = color;
    this.nickname = nik;
    this.score = 0;
    this.win = false;    // игрок выиграл
    this.died = false;   // игрок умер
    this.hp = 100;      
    this.minDamage = 40;    
    this.maxDamage = 60;   
    this.damaged = false;       // игрок получил урон
    this.fliped = false;        // игрок повернут
    this.id = id;               
    this.x = x;
    this.y = y;             
    this.size = new Vector(40, 20);
    this.pos = new Vector(x , y);
    this.moveSpeed = new Vector(0, 0)
    this.animCount = 0;                         
    this.animationTime = 0;
    this.attacks = false;        //игрок атакует
    this.ready = false;         //игрок готов к игре
    this.attackTime = 700;     //задержка перед началом следующей атаки
    this.tryToBlock = false;    // игрок пробовал блокировать
    this.blocked = false;       // игрок блокировал
    this.defends = false;
    this.chanceToBlock = 0.7;    // игрок защищается
}
Player.prototype.act = function(data){
    if(data.keys.e && !this.damaged && !this.attacks){
        this.defends = true;
        this.animCount = 16;  
    }
    else{
       this.defends = false;
    }
    if(data.keys.click && !this.attacks){
        this.animCount = 9;
        this.attacks = true;
    }
    if(this.win){
        if(this.animCount < 30){
            this.animCount = 30;
        }
        if(this.animationTime > 400){
            this.animCount ++;
            this.animationTime = 0;
            if(this.animCount == 33){
                this.animCount = 32;
            }
        }
        this.animationTime +=serverTick;
    }
    else if(this.died){
        if(this.animCount < 16){
            this.animCount = 16;
        }
        if(this.animationTime > 200){
            this.animCount ++;
            this.animationTime = 0;
            if(this.animCount == 25){
                this.animCount = 24;
            }
        }
        this.animationTime +=serverTick;
    }
    else if(this.damaged){
        this.animCount = this.animCount > 14 ? 13 : 14
        if(this.animationTime > 200){
            this.animCount ++
        }
        this.animationTime +=serverTick;
        if(collisionGrid(this.pos.plus(this.moveSpeed), this.size)){

        }
        else{
            this.pos = this.pos.plus(this.moveSpeed);
        }        
    }
    else if(this.defends){

    }
    else if(this.attacks){
        let attackBox = {
            pos : this.fliped ? this.pos.plus(new Vector(-25, 0)) : this.pos,
            size : this.fliped ? this.size.plus(new Vector(0, 0)) : this.size.plus(new Vector(25, 0))
        }
        let enemy = collision(attackBox, this);
        if(enemy && this.animCount > 12){
            enemy.forEach( elem => {
                if(!elem.damaged){
                    if(elem.defends){
                        if(!elem.tryToBlock){
                            elem.tryToBlock = true;
                            if(Math.random() > elem.chanceToBlock){
                                elem.defends = false;
                                elem.takeDamage(this)
                            }
                            else{
                                elem.blocked = true;
                            }
                            setTimeout(() => {
                                elem.tryToBlock = false;
                                elem.blocked = false;
                            },800)
                        }
                    }
                    else{
                        elem.takeDamage(this);
                    }  
                }               
            })
        }
        if(this.animationTime > this.attackTime/5){           
            if(this.animCount >= 13){
                this.attacks = false;
            }
            else{
                this.animCount ++;
            }
            this.animationTime = 0;
        }
        this.animationTime +=serverTick;
    }
    else{
        let motion = new Vector(0, 0);
        if(data.keys.up) motion = motion.plus(new Vector(0, -1))
        if(data.keys.down) motion = motion.plus(new Vector(0, 1))
        if(data.keys.right) motion = motion.plus(new Vector(1, 0)) 
        if(data.keys.left) motion = motion.plus(new Vector(-1, 0))
        if(motion.x ==0 && motion.y == 0){
            this.animCount = 8;
        }
        else{
            if(!this.fliped && motion.x < 0) this.fliped = true
            if(motion.x > 0) this.fliped = false
            if(this.animationTime > 200){
                this.animCount ++;
                this.animationTime = 0
                if(this.animCount > 6){
                    this.animCount = 0
                }
            }
            this.animationTime +=serverTick
        }
        if(collisionGrid(this.pos.plus(motion), this.size)){

        }
        else{
            this.pos = this.pos.plus(motion)
        }        
    } 
    return this; 
}
Player.prototype.takeDamage = function(attacker){
    this.hp -= attacker.getDamage();
                        if(this.hp <= 0){
                            this.died = true;
                            attacker.poits++;
                            setTimeout(() =>{
                                if(this.died && gameIsStarted){
                                    this.died = false;
                                    let randomSpot = level.massSpots[Math.floor(Math.random() * level.massSpots.length)];
                                    this.pos = new Vector(randomSpot.pos.x + 50, randomSpot.pos.y + 50)
                                }
                            },5000)   
                        } 
                        this.moveSpeed = getDelta(attacker, this);
                        this.damaged = true;
                        setTimeout(()=>{
                        if(this){
                            this.moveSpeed = new Vector(0 , 0);
                            this.damaged = false;
                        }                 
                        },400)
}
Player.prototype.getDamage = function(){
    return Math.round(Math.random() * (this.maxDamage - this.minDamage) + this.minDamage)
}
function Vector(x, y){
    this.x = x;
    this.y = y;
}
Vector.prototype.plus = function(other){
    return new Vector(this.x + other.x, this.y + other.y)
}

function collision(pos , actor){
    var mass = [];
    for (var i = 0; i < level.users.length; i++) {
      var other = level.users[i];
      if (other != actor &&
          pos.pos.x + pos.size.x > other.pos.x &&
          pos.pos.x < other.pos.x + other.size.x &&
          pos.pos.y + pos.size.y > other.pos.y &&
          pos.pos.y < other.pos.y + other.size.y)
        mass.push(other)
    }
    if(mass.length != 0){
      return mass;
    }
}

function getDelta(one, two){
    let deltaX = one.pos.x - two.pos.x;
    let deltaY = one.pos.y - two.pos.y;
    deltaX = Math.abs(deltaX) < 5 ? 0 : deltaX;
    deltaY = Math.abs(deltaY) < 5 ? 0 : deltaY;
    if(deltaX != 0 && deltaX < 0) deltaX =  1;
    else if(deltaX != 0 && deltaX > 0) deltaX =  -1;
    if(deltaY != 0 && deltaY < 0) deltaY =  1;
    else if(deltaY != 0 && deltaY > 0) deltaY =  -1;
    return new Vector(deltaX, deltaY) 
}

function collisionGrid(pos, size){
    var mass = [];
    for (var i = 0; i < level.massWalls.length; i++) {
      var wall = level.massWalls[i];
      if (
          pos.x + size.x > wall.pos.x &&
          pos.x < wall.pos.x + wall.size.x &&
          pos.y + size.y > wall.pos.y &&
          pos.y < wall.pos.y + wall.size.y)
        mass.push(wall)
    }
    if(mass.length != 0){
      return mass;
    }
}