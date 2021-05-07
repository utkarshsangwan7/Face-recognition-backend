const express = require('express');
const Clarifai = require('clarifai'); 
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const app = express();
const knex = require('knex');
const saltRounds = 10;
const myPlaintextPassword = 's0/\/\P4$$w0rD';
const someOtherPlaintextPassword = 'not_bacon';

app.use(bodyParser.json());
app.use(cors());
// app.use(cors({ origin: `${process.env.CLIENT_URL}`, credentials: true }));
// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", `${process.env.CLIENT_URL}`);
//   res.header("Access-Control-Allow-Credentials", true);
//   res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   next();
// });

const appp = new Clarifai.App({
 apiKey: '635fbb3235c74b2fb26adcd9dffcded4'
});

const db = knex({
	client:'pg',
	connection: {
		connectionString:process.env.DATABASE_URL
		// ssl:true
	}
});

app.get('/',(req,res)=>{
	res.json('It is working!!');
})

app.post('/signin',(req,res)=>{
	const {email,password} = req.body;
	if(!email||!password){
			res.status(400).json('Error in registering!');
	}else{
	db.select('email','hash')
	.from('login')
	.where('email','=',email)
	.then(data =>{
			bcrypt.compare(password, data[0].hash).then(function(result) {
    			if(result)
    			{
    				return  db.select('*').from('users')
    				.where('email','=',email)
    				.then(user=>{
    					res.json(user[0]);
    				})
    				.catch(err=>res.status(404).json("Invalid email or password!"))
    			}
    			else{
    				res.status(404).json("Invalid email or password!");
    			}
		})
		.catch(err=>res.status(404).json("Invalid email or password!"));
	})
	.catch(err=>res.status(404).json("Invalid email or password!"));
	}
});

app.post('/register',(req,res)=>{
	console.log('CHal rha hai!');
	const {name,email,password} = req.body;
		if(!name||!email||!password){
			res.status(400).json('Error in registering!');
		}else{
	    bcrypt.hash(password, saltRounds)
	    .then(function(hash) {
   		 				db.transaction(trx=>{
						trx.insert({
							email: email,
							hash: hash
						})
						.into('login')
						.returning('email')
						.then(signedEmail=>{
						  return db('users')
							    .returning('*')
							    .insert({
							    	email:signedEmail[0],
							    	name:name,
							    	joined: new Date()
							    })
							    .then(user=>{
							    	res.json(user[0]);
							    })
							    .catch(err=>res.status(400).json('Error in registering!'))
						.then(trx.commit)
						.catch(err=>{
							err=>res.status(400).json('Error in registering!');
							trx.rollback;
							});
						})
						.catch(err=>res.status(400).json('Error in registering!'));
						});
			});
	  	}
	});

app.get('/profile/:id',(req,res)=>{
	const {id} = req.params;
	let flag = 0;
	db.select('*').from('users').where({
		id: id
	})
	.then(user=>{
		if(user.length){
			res.json(user[0]);	
		}
		else
		{
			res.status(404).json('The user not found');
		}
	})
	.catch(err=>res.status(404).json(err));
});

app.post('/clarifai',(req,res)=>{
	appp.models.predict(Clarifai.FACE_DETECT_MODEL,req.body.image)
    .then(response=>res.status(200).json(response))
    .catch((err)=>{
      console.log(err);
      res.status(400).json('Error in processing the image');
    });
});

app.put('/image',(req,res)=>{
	const {id} = req.body;
	db('users')
	.increment('entries',1)
	.where('id','=',id)
	.returning('entries')
	.then(entries=>{
		if(entries.length){
			res.json(entries[0]);
		}
		else{
			res.status(404).json('Could not get the user');
		}
	});
})

process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
});

process.on("uncaughtException", (err, promise) => {
  console.log(`Error: ${err.message}`);
});

app.listen(process.env.PORT || 3000,()=>{
	console.log(`The app is currently running on port 3000`);
});

