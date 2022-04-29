const express = require('express');
const app = express();
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}));


app.use(passport.initialize());
app.use(passport.session()); 

app.use(express.urlencoded({extended:true}));

/* 정적파일 */
app.use('/public', express.static(__dirname + '/public'));

/* db*/
var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '111111',
  database : 'notice'
});
 
connection.connect();

app.set('view engine','ejs');


function login(req,res,next){
  if(req.user){
    console.log("check"+req.user);
    next()
  }else{
    res.write(`<script charset="utf-8">alert('you should login')</script>`);
    res.write("<script>window.location=\"/\"</script>");
  }
}


passport.use(new LocalStrategy({
  usernameField: 'id',
  passwordField: 'pw',
  session: true,
  passReqToCallback: false,
},  function (inputId,inputPw, done) {
  //console.log(입력한아이디, 입력한비번);

  connection.query(`SELECT * FROM user WHERE user_id = '${inputId}'`,(err,results)=>{
    if(err){console.log(error)}
    if(results.length<=0){
      console.log(results)
      return done(null,false,{message:'존재하지 않는 아이디'})}
    if(inputPw == results[0].pw){
/*       console.log(inputId,inputPw)
      console.log(results) */
      return done(null,results)
    }else{
      return done(null,false,{message:'비번틀림'})
    }   
  })
}));

/* id를 이요해서 세션을 저장/ 로그인 성공시 발생 */
passport.serializeUser(function (user, done) {
/*   connection.query(`SELECT * FROM user WHERE session = '${req.session}'`,(err,results)=>{
  }) */
  console.log("시리얼라이즈 유저")
  console.log(user[0].user_id)
  done(null, user[0].user_id)
});
/* 이 세션 데이터를 가진 사람을 db에서 찾아주세요/ 마이페이지 접속시 발생 */
passport.deserializeUser(function (user, done) {
  connection.query(`SELECT * FROM user WHERE user_id = '${user}'`,(err,result)=>{
    console.log("check")
    // console.log("보낼정보"+ results[0].user_id+results[0].pw)
    // console.log("result:"+results[0].user_id)\
    console.log(result);
    done(null,result);
  });
}); 

app.post('/login', passport.authenticate('local', {failureRedirect : '/login'}), function(req, res){
  res.redirect('/')
});

app.get('/signUp',(req,res)=>{
  res.render('./pages/signUp.ejs');
});

app.post('/createUser',(req,res)=>{
  connection.query(`INSERT INTO user VALUES ('${req.body.id}','${req.body.password}')`,(err,results,fields)=>{
    if(err){
      console.log("오류: "+err);
    }else{
      res.redirect('/login');
    }
  });
});

app.get('/',(req,res)=>{
  console.log(req.user)
  res.render('./pages/index.ejs');
});

app.get('/login',(req,res)=>{
  res.render('./pages/login.ejs');
});



app.get('/myPage',login,(req,res)=>{
  console.log(req.user[0].user_id)
  /* console.log("내정보: "+req.user)
  res.render('./pages/myPage.ejs',{user:req.user[0]}); */
  connection.query(`SELECT board_id, writer, title, content,DATE_FORMAT(regdate,"%y/%m/%d") as date FROM board where writer='${req.user[0].user_id}'`, function (error, results, fields) {
    console.log(results)
    if (error) {
      console.log(error)
    }
    res.render('./pages/myPage.ejs',{boards:results})
  });
});


app.get('/write',login,(req,res)=>{
  res.render('./pages/write.ejs',{user:req.user[0]});
});

app.post('/add',(req,res)=>{
  connection.query(`INSERT INTO board (writer,title,content,regdate) values ('${req.body.writer}','${req.body.title}','${req.body.content}',NOW());`)
  console.log(req.body);
  res.redirect('/myPage');
})

app.get('/list/:page',(req,res)=>{
  console.log(req.params)
  connection.query('SELECT board_id, writer, title, content,DATE_FORMAT(regdate,"%y/%m/%d") as date FROM board ', function (error, results, fields) {
    const listCnt = results.length;
    let pageCnt=0;
    
    if(listCnt%5 == 0){
      pageCnt = parseInt(listCnt/5);
    }else{
      pageCnt = parseInt(listCnt/5)+1;
    } 

    console.log(listCnt) 
    if (error) {
      console.log(error)
    }
    if(req.params.page ==1){
      results = results.slice(0,5)
      console.log(results)
    }else{
      results = results.slice((req.params.page-1)*5,req.params.page*5)
    }
    res.render('./pages/list.ejs',{boards:results , pageCnt ,pageChk:req.params})
    console.log(results)
  });
})


app.get('/detail/:id',(req,res)=>{
  connection.query(`SELECT * FROM board WHERE board_id= ${req.params.id}`, function (error, results, fields) {
    if (error) {
      console.log(error)
    }
    let checkId = false;
    console.log("ddd")
    console.log(req.user)
    if(req.user){
      console.log(results[0].writer)
      console.log(req.user[0].user_id)
      if(req.user[0].user_id==results[0].writer){
        console.log("동일 인물");
        checkId =true;
      }else{
        console.log("다른 사람입니다.")
      }
    }                                                                                                                                                                                                                                                                                                                            
    res.render('./pages/detail.ejs',{detail:results,user:results[0].writer,checkId:checkId})
  });
})

app.get('/update/:id',(req,res)=>{
  connection.query(`SELECT * FROM board WHERE board_id= ${req.params.id}`, function (error, results, fields) {
    console.log(results);
    res.render('./pages/update.ejs',{user:results[0]})
  });
});

app.post('/update/:id',(req,res)=>{
  connection.query(`update board set title= ${req.body.title} , content = ${req.body.content} ,updatedate=NOW()  WHERE board_id= ${req.params.id}`, function (error, results, fields) {
    console.log("fadafsfas")
    console.log(results)
    // res.render(`./pages/list.ejs`);
    res.redirect('/detail/:id')
  });
})

app.post('/delete', (req, res)=>{
  connection.query(`DELETE FROM board WHERE board_id = '${req.body.board_id}';`, function(err, results){
    console.log('삭제완료');
  })
  res.redirect('/list/1')
});

app.listen(3000);