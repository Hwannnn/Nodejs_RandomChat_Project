var express = require('express');
var app = express();
var path = require('path');
var http = require('http').createServer(app);
var io = require('socket.io').listen(http);

app.use(express.static(path.join(__dirname, 'html')));

app.get('/index',function(req,res){
  res.sendFile('./html/' + '/index.html');
});

http.listen(process.env.PORT || 10100);

// socket.io 셋팅
io.configure(function(){
    io.set('transports', ['xhr-polling', 'jsonp-polling' ]);
    io.set('polling duration', 10);
    io.set('log level', 2);
});

var socketRoom = {};

io.sockets.on('connection', function(socket){
    // 접속완료를 알림.
    socket.emit('connected');
	socket.emit('identifyId', socket.id);

    // chat요청을 할 시
	socket.on('requestRandomChat', function(data){
        // 빈방이 있는지 확인
        console.log('connect : ' + socket.id + data);
        var rooms = io.sockets.manager.rooms;
        var Maxcount = 0; // 가장 많은 관심사 매칭 개수를 저장하는 변수
        var Maxkey = 0; // 위의 결과에서의 key값을 저장하는 변수
        var MaxInterest = 0 ;// 매칭 관심사 출력을 위한 스트링변수
        
        // 키값을 받아서 입장하는 함수
        function enter(key,msg){
                    var roomKey = key.replace('/', '');
                    socket.join(roomKey);
                io.sockets.in(roomKey).emit('completeMatch', {});
                socketRoom[socket.id] = roomKey;
                io.sockets.in(socketRoom[socket.id]).emit('firstMessage', {message:msg}, 'System');
            return;
            }
        
        for (var key in rooms){
            if (key == ''){
                continue;
            }
            
         var temp = key.split("@");   // 방장의 관심사 배열로 저장
         var datav = data.split("@"); // 새로 입장한 사람의 관심사 배열 저장
         var countInterest = 0; // 매칭 관심사 카운트
         var strInterest = '' ; //매칭되는 관심사 를 스트링으로 
                     
            // 혼자있으면 입장
         if('/'+socket.id != temp[0] && rooms[key].length == 1){                 
               // 관심사 매칭개수
                 for(var i = 1 ; i < temp.length; i++){ 
                    for(var j = 1; j < datav.length ;j++){                     
                       if( temp[i] == datav[j] ){
                               ++countInterest ;
                               strInterest += ( datav[j] + ', ' ) ;
                            }
                       } 
                    }// 관심사 매칭개수 반복문 종료
              
                   // 더 많은 매칭결과를 저장
                     /*   더 많은 매칭 카운트가 발생했을 때, 그때의 방장의 key값과 매칭된 관심사를
                      * 스트링으로 변환한 strInterest를 Max**에 대입
                      */
                   if( Maxcount < countInterest ){
                      Maxcount = countInterest;
                      Maxkey = key ;
                      MaxInterest = strInterest ;
                   }// 매칭결과 저장 조건문 끝
         }         
        }// 방 개수만큼 반복문 종료
       
        
        if(Maxcount>=1){        
           enter(Maxkey,MaxInterest);// 하나라도 매칭된 카운트가 있다면 그 키값을 받아서 방에 입장
        }else{        
        // 빈방이 없으면 혼자 방만들고 기다림.
        socket.join(socket.id + data);
        socketRoom[socket.id] = socket.id + data;
      console.log(io.sockets.manager.rooms);
        }

	});
    
    // 요청 취소 시
    socket.on('cancelRequest', function(data){
		socket.leave(socketRoom[socket.id]);
	});
    
    // client -> server Message전송 시
    socket.on('sendMessage', function(data){
		io.sockets.in(socketRoom[socket.id]).emit('receiveMessage', data, socket.id);
    });
    
    // disconnect
    socket.on('disconnect', function() {
			if (socketRoom[socket.id] != undefined) {
				var key = socketRoom[socket.id];
				socket.leave(key);
				io.sockets.in(key).emit('disconnect');
				var clients = io.sockets.clients(key);
				for (var i = 0; i < clients.length; i++){
					clients[i].leave(key);
				}
			}
    });
});
