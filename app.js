const express=require('express');
const handlebars = require('handlebars');
const exphbs=require('express-handlebars');
const mongoose=require('mongoose');
const bodyParser=require('body-parser');
const session=require('express-session');
const cookieParser=require('cookie-parser');
const passport=require('passport');
const bcrypt=require('bcryptjs');
const {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access')
const formidable=require('formidable');
const socketIO=require('socket.io');
const http=require('http');
const stripe=require('stripe')('YOUR_SK_KEY');

const app=express();

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(function (req, res, next) {

    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

app.use(cookieParser());
app.use(session({
    secret: 'mysecret',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
const {requireLogin,ensureGuest}=require('./helpers/authHelper');
const {upload}=require('./helpers/aws');
require('./passport/local');
// require('./passport/facebook');


app.use((req,res,next)=>{
    res.locals.user=req.user||null;
    next();
});

const keys=require('./config/keys');
const User = require('./models/user');
const Contact = require('./models/contact');  
const Car = require('./models/car');
const Budjet=require('./models/budjet');


mongoose.connect('',{
    useNewUrlParser: true
},()=>{
    console.log('MongoDB is connected');
});


app.engine('handlebars',exphbs.engine({
    defaultLayout: 'main',
    handlebars: allowInsecurePrototypeAccess(handlebars)
}));

app.set('view engine','handlebars');
app.use(express.static('public'));


app.get('/',ensureGuest,(req,res)=>{
    res.render('home');
});

app.get('/about',ensureGuest,(req,res)=>{
    res.render('about',{
        title: 'About'
    });
});

app.get('/contact',requireLogin,(req,res)=>{
    res.render('contact',{
        title: 'Contact us'
    });
});

app.post('/contact',requireLogin,(req,res)=>{
    console.log(req.body);
    const newContact = {
        name: req.user._id,
        message: req.body.message
    }
    new Contact(newContact).save((err,user)=>{
        if(err){
            throw err;
        }
        else{
            res.render('thankYou')
        }
    });
});

app.get('/signup',ensureGuest,(req,res)=>{
    res.render('signupForm',{
        title: 'Register'
    });
});

app.post('/signup',ensureGuest,(req,res)=>{
   let errors=[];
   if(req.body.password!==req.body.password2){
    errors.push({text: 'Password does not match!'});
   }
   if(req.body.password.length<5){
    errors.push({text: 'Password must be at least 5 characters!'});
   }
   if(errors.length>0){
    res.render('signupForm',{
        errors: errors,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber
    });
   }else{
    User.findOne({email:req.body.email})
    .then((user)=>{
        if(user){
            let errors=[];
            errors.push({text:'Email already exist!'});
            res.render('signupForm',{
                errors: errors,
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                phoneNumber: req.body.phoneNumber
            });
        }else{
            let salt=bcrypt.genSaltSync(1);
            let hash=bcrypt.hashSync(req.body.password,salt);

            const newUser={
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                password: hash,
                email: req.body.email,
                phoneNumber: req.body.phoneNumber
            }
            
            new User(newUser).save((err,user)=>{
                if(err){
                    throw err;
                }
                if(user){
                    let success=[];
                    success.push({text: 'You successfully created an account! You can login now'});
                    res.render('loginform',{
                        success:success
                    })
                }
            });


        }
    })
   }
});

app.get('/displayLoginForm',ensureGuest,(req,res)=>{
    res.render('loginform',{
        title:'Login'
    });
});


app.post('/login',passport.authenticate('local',{
    successRedirect: '/profile',
    failureRedirect: '/loginErrors'
}));
// app.get('/auth/facebook', passport.authenticate('facebook', { 
//     scope : ['email'] 
// }));
// app.get('/auth/facebook/callback',passport.authenticate('facebook',{
//     successRedirect: '/profile',
//     failureRedirect: '/'
// }));

app.get('/profile',requireLogin,(req,res)=>{
    User.findById({_id:req.user._id})
    .then((user)=>{
        user.online=true;
        user.save((err,user)=>{
            if(err){
                throw ree;
            }
            if(user){
                res.render('profile',{
                    user:user,
                    title:'Profile'
                });
            }
        })
    });
});

app.get('/loginErrors',(req,res)=>{
    let errors=[];
    errors.push({text:'User not found or password incorrect!'});
    res.render('loginForm',{
        errors:errors,
        title:'Error'
    });
});

app.get('/listCar',requireLogin,(req,res)=>{
    res.render('listCar',{
        title: 'Listing'
    });
});

app.post('/listCar',requireLogin,(req,res)=>{
  
});

app.post('/listCar2',requireLogin,(req,res)=>{
    
});

app.get('/showCars',requireLogin,(req,res)=>{
    Car.find({})
    .populate('owner')
    .sort({date:'desc'})
    .then((cars)=>{
        res.render('showCars',{
            cars:cars
        })
    })
})

app.post('/uploadImage',requireLogin,upload.any(),(req,res)=>{
 
});


app.get('/logout',(req,res)=>{
    // console.log(req.user);
 
});

app.get('/openGoogleMap',(req,res)=>{
    res.render('googlemap');
});

app.get('/displayCar/:id',(req,res)=>{
    Car.findOne({_id:req.params.id}).then((car)=>{
        res.render('displayCar',{
            car:car
        });
    })
});

app.get('/contactOwner/:id',(req,res)=>{
    User.findOne({_id:req.params.id})
    .then((owner)=>{
        res.render('ownerProfile',{
            owner:owner
        })
    })
});

app.get('/RentCar/:id',(req,res)=>{
    Car.findOne({_id:req.params.id})
    .then((car)=>{
        res.render('calculate',{
            car:car
        });
    });
});

app.post('/calculateTotal/:id',(req,res)=>{
  
});





const port=process.env.PORT || 3000;

server.listen(port,()=>{
    console.log('server is running');
});

