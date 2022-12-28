//This hosts an Express Server which connects to MongoDB Atlas via Realm

const express = require('express');
const Realm = require('realm');
const {
    BSON: { ObjectId },
  } = Realm;
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');
const bcrypt = require('bcrypt');

//The code for sending Email
// const API_KEY = '';
// sgMail.setApiKey(API_KEY);

const PORT = process.env.PORT || 3000;

const app = express();
const app_ = new Realm.App({ id: 'capstone-pfaej' });

app.use(cors());
app.use(bodyParser.json());

let mongo, collection;

function verifyToken(req, res, next){
    if(!req.headers.authorization){
        return res.status(401).send('Unauthorized request');
    }
    let token = req.headers.authorization.split(' ')[1];
    if(token === 'null'){
        return res.status(401).send('Unauthorized request');
    }
    let payload = jwt.verify(token, 'secretKey');

    if(!payload){
        return res.status(401).send('Unauthorized request');
    }
    next();
}

async function generateHash(pass){
    const salt = await bcrypt.genSalt();
    const hashedPass = await bcrypt.hash(pass, salt);
    return hashedPass;
}

async function loginRealm(){
    const credentials = Realm.Credentials.anonymous();
    const user = await app_.logIn(credentials);
}

async function getGeneralNotifications(){
    collection = mongo.db("capstone").collection("general");
    const result = await collection.find({});
    return result;
}

async function getSpecialNotifications(){
    collection = mongo.db("capstone").collection("special");
    const result = await collection.find({});
    return result;
}

async function login(email){
    collection = mongo.db("capstone").collection("users");
    const result = await collection.findOne({"email": email});
    return result;
}

async function getCounter(){
    collection = mongo.db("capstone").collection("counter");
    const result = await collection.find({});
    return result;
}

async function setCounter(newValue){
    collection = mongo.db("capstone").collection("counter");
    const result = await collection.updateMany({},  { $set: { value: newValue } });
    return result;
}

async function addRegistration(newRegistration){
    collection = mongo.db("capstone").collection("registrations");
    const result = await collection.insertOne(newRegistration);
    return result;
}

async function verifyRegistration(user){
    collection = mongo.db("capstone").collection("registrations");
    const result = await collection.findOne({ "id": user.id, "email": user.email});
    return result;
}

async function registerUser(user){
    collection = mongo.db("capstone").collection("users");
    const result = await collection.insertOne(user);
    return result;
}

async function getStudents(){
    collection = mongo.db("capstone").collection("users");
    const result = await collection.find({"role":"student"});
    return result;
}

async function blockUser(blockId){
    collection = mongo.db("capstone").collection("users");
    const result = await collection.updateOne({ "id": blockId }, { $set: { "active": false } });
    return result;
}

async function unblockUser(unblockId){
    collection = mongo.db("capstone").collection("users");
    const result = await collection.updateOne({ "id": unblockId }, { $set: { "active": true } });
    return result;
}

async function resetPass(id, hashedPass){
    collection = mongo.db("capstone").collection("users");
    const result = await collection.updateOne({ "id": id }, { $set: { "password": hashedPass } });
    return result;
}

async function getLeavesAdmin(){
    collection = mongo.db("capstone").collection("leaves");
    const result = await collection.find({"status":"pending"});
    return result;
}

async function getProfile(_id){
    collection = mongo.db("capstone").collection("users");
    const result = await collection.findOne({"_id": ObjectId(_id)});
    return result;
}

async function editProfile(id, email){
    collection = mongo.db("capstone").collection("users");
    const result = await collection.updateOne({"id": id}, { $set: { "email": email }});
    return result;
}

async function getLeavesStudent(regID){
    collection = mongo.db("capstone").collection("leaves");
    const result = await collection.find({"registrationID": regID});
    return result;
}

async function applyLeave(leave){
    collection = mongo.db("capstone").collection("leaves");
    const result = await collection.insertOne(leave);
    return result;
}

async function changePass(id, newPass){
    collection = mongo.db("capstone").collection("users");
    const result = await collection.updateOne({ "id": id }, { $set: { "password": newPass } });
    return result;
}

async function processLeave(_id, status){
    collection = mongo.db("capstone").collection("leaves");
    const result = await collection.updateOne({"_id": ObjectId(_id)}, { $set: { "status": status }});
    return result;
}

async function deleteGeneral(name){
    collection = mongo.db("capstone").collection("general");
    const result = await collection.deleteOne({"name": name});
    return result;
    
}

async function deleteSpecial(name){
    collection = mongo.db("capstone").collection("special");
    const result = await collection.deleteOne({"name": name});
    return result;
}

async function addGeneral(notification){
    collection = mongo.db("capstone").collection("general");
    const result = await collection.insertOne(notification);
    return result;
}

async function addSpecial(notification){
    collection = mongo.db("capstone").collection("special");
    const result = await collection.insertOne(notification);
    return result;
}

app.listen(PORT, () => {
    console.log('Capstone back-end server running..'+PORT);
    loginRealm().then( () => {
        mongo = app_.currentUser.mongoClient("mongodb-atlas");
        //collection = mongo.db("capstone").collection("general");
        console.log('Logged in..');
    }).catch( (err) => {
        console.log('Failed to log in.. '+err);
    })
});

app.get('/', (req,res) => {
    res.send('Hello from Capstone back-end server..');
});


//--------HOME---------------------------------------
//general notifications - anyone can access this
app.get('/home', (req,res) => {
    getGeneralNotifications().then( (data) => {
            res.status(200).json(data);
        }).catch( (err) => {
            res.status(500).send('Server error');
        });
});
//--------HOME---------------------------------------

//--------NOTIFICATIONS---------------------------------------
//special notifications - only logged in users can access this
app.get('/notifications', verifyToken, (req,res) => {
    getSpecialNotifications().then( (data) => {
            res.status(200).json(data);
        }).catch( (err) => {
            res.status(500).send('Server error');
        });
});
//--------NOTIFICATIONS---------------------------------------

//--------LOGIN STUDENT---------------------------------------
app.post('/login', (req, res) => {
    let userData = req.body;
    login(userData.email).then( (result) => {
        if(!result){
            res.status(401).send('Invalid email');
        }
        else{
            bcrypt.compare(userData.password, result.password, (err, isMatch) => {
                if( err ) {
                    res.status(500).send('Server error');
                }
                else if(!isMatch){
                    res.status(401).send('Invalid password');
                }
                else if(result.active == false){
                    res.status(401).send('Account disabled');
                }
                else {
                    let payload = { subject: result._id+' '+result.role };
                    console.log(payload);
                    let token = jwt.sign(payload, 'secretKey');
                    res.status(200).send({token});
                    //res.status(200).json(result);
                }
            })
        }
    }).catch( (err) => {
        res.status(500).send('Server error');
    });
})
//--------LOGIN STUDENT---------------------------------------

//--------GET COUNTER---------------------------------------
//fetches value of counter from counter collection to generate unique Registration ID
//updates value of counter by 1 for next operation
app.get('/counter', verifyToken, (req, res) => {
    let myValue = 0;
    getCounter().then( (result) => {
        myValue = result[0].value;
        myValue++;
        setCounter(myValue).then( (result) => {
            console.log(result);
            console.log('Counter updated..');
        }).catch((err) => {
            res.status(500).send('Server error');
        });
        res.status(200).json(result);
    }).catch( (err) => {
        res.status(500).send('Server error');
    });
})
//--------GET COUNTER---------------------------------------

//--------REGISTER STUDENT---------------------------------------
app.post('/register', (req, res) => {
    let pass = req.body.password;
    generateHash(pass).then( (hashedPass) => {
        let userData = {
            "id": req.body.id,
            "email": req.body.email,
            "password": hashedPass,
            "role": "student",
            "active":true
        };
        let searchUser = {
            "id": req.body.id,
            "email": req.body.email
        };
        verifyRegistration(searchUser).then( (result) => {
            if(!result){
                console.log('Reg ID or email not correct..');
                res.status(401).send("Invalid registration ID or email");
            }
            else{
                registerUser(userData).then( (result2) => {
                    getProfile(result2.insertedId).then( (result3) => {
                        let payload = { subject: result3._id+' '+result3.role};
                        let token = jwt.sign(payload, 'secretKey');
                        res.status(200).json({token});
                    }).catch((err) => {
                        res.status(500).send('Server error');
                    })
                }).catch((err) => {
                    res.status(500).send('Server error');
                })
            }
        }).catch((err) => {
            res.status(500).send('Server error');
        })
    }).catch((err) => {
        res.status(500).send('Server error');
    })
})

//--------SEND EMAIL---------------------------------------
//sends email to student
//updates registration collection so that registration id can be verified when student tries to register
app.post('/send-email', verifyToken, (req, res) => {

    //email section
    // let message = {
    //     to: req.body.email,
    //     from: 'shekhar.limbu.edu@gmail.com',
    //     subject: 'Email via Node.js app',
    //     text: req.body.id
    // }

    // sgMail.send(message).then(response => {
    //     console.log('Email sent successfully..')
    // }).catch(error => {
    //     console.log('Email failed..')
    // });

    //registration section
    let newRegistration = {
        "id": req.body.id,
        "email": req.body.email
    }

    addRegistration(newRegistration).then( (result) => {
        console.log(result);
        res.status(200).json({"status":"success"})
    }).catch((err) => {
        res.status(500).send('Server error');
    })
})
//--------SEND EMAIL---------------------------------------

//--------GET STUDENTS---------------------------------------
//for admin - displays list of all students
app.get('/students', verifyToken, (req, res) => {

    getStudents().then((result) => {
        res.status(200).send(result);
    }).catch((err) => {
        res.status(500).send('Server error');
    })
});
//--------GET STUDENTS---------------------------------------

//--------BLOCK STUDENT---------------------------------------
//for admin - changes active to false
app.post('/students/block', verifyToken, (req,res) => {

    let blockId = req.body.id;

    blockUser(blockId).then( (result) => {
        console.log('User blocked..');
            res.status(200).json(result);
    }).catch((err) => {
        res.status(500).send('Server error');
    });
})
//--------BLOCK STUDENT---------------------------------------

//--------UN-BLOCK STUDENT---------------------------------------
//for admin - changes active to true
app.post('/students/unblock', verifyToken, (req,res) => {

    let unblockId = req.body.id;

    unblockUser(unblockId).then( (result) => {
        console.log('User unblocked..');
        res.status(200).json(result);
    }).catch((err) => {
        res.status(500).send('Server error');
    });
})
//--------UN-BLOCK STUDENT---------------------------------------

//--------RESET PASSWORD---------------------------------------
//for admin - changes password to abc
app.post('/students/reset', verifyToken, (req,res) => {

    let pass = 'abc';
    let resetId = req.body.id;
    generateHash(pass).then( (hashedPass) => {
        resetPass(resetId, hashedPass).then( (result) => {
            res.status(200).json(result);
        }).catch((err) => {
            res.status(500).send('Server error');
        });
    }).catch((err) => {
        res.status(500).send('Server error');
    })
})
//--------RESET PASSWORD---------------------------------------

//--------GET ALL LEAVES---------------------------------------
//for admin - displays all pending leaves
app.get('/all-leaves', verifyToken, (req, res) => {

    getLeavesAdmin().then( (result) => {
        res.status(200).send(result);
    }).catch((err) => {
        res.status(500).send('Server error');
    });

    //to test
});
//--------GET ALL LEAVES---------------------------------------

//--------APPROVE/REJECT LEAVE---------------------------------------
//for admin - changes status from pending to approved or rejected
app.post('/all-leaves/process', verifyToken, (req, res) => {

    processLeave(req.body._id, req.body.status).then( (result) => {
        res.status(200).send(result);
    }).catch((err) => {
        res.status(500).send('Server error');
    });
});

//--------APPROVE/REJECT LEAVE---------------------------------------

//--------GET PROFILE---------------------------------------
//for student - shows his/her profile details
app.post('/profile', verifyToken, (req, res) => {
    let _id = req.body._id;

    getProfile(_id).then( (result) => {
        res.status(200).json(result);
    }).catch((err) => {
        res.status(500).send('Server error');
    });
});
//--------GET PROFILE---------------------------------------

//--------EDIT PROFILE---------------------------------------
//for student - changes profile details
app.post('/profile/edit', verifyToken, (req, res) => {
    editProfile(req.body.id, req.body.email).then( (result) => {
        res.status(200).json(result);
    }).catch((err) => {
        res.status(500).send('Server error');
    });
})
//--------EDIT PROFILE---------------------------------------

//--------GET ALL STUDENT LEAVES---------------------------------------
//for student - displays all his/her leaves
app.post('/my-leaves', verifyToken, (req, res) => {
    
    getLeavesStudent(req.body.id).then( (result) => {
        res.status(200).json(result);
    }).catch((err) => {
        res.status(500).send('Server error');
    });
});
//--------GET ALL STUDENT LEAVES---------------------------------------

//--------APPLY LEAVE---------------------------------------
//for student - adds a new leave
app.post('/my-leaves/add', verifyToken, (req, res) => {
    let leave = {
        "registrationID": req.body.registrationID,
        "email": req.body.email,
        "from": req.body.from,
        "to": req.body.to,
        "status": "pending"
    };

    applyLeave(leave).then( (result) => {
        res.status(200).json(result);
    }).catch((err) => {
        res.status(500).send('Server error');
    });
});
//--------APPLY LEAVE---------------------------------------

//--------CHANGE PASSWORD---------------------------------------
//for student
app.post('/profile/changepass', verifyToken, (req, res) => {

    let pass = req.body.newPassword;
    generateHash(pass).then( (hashedPass) => {
        changePass(req.body.id, hashedPass).then( (result) => {
            res.status(200).json(result);
        }).catch((err) => {
            res.status(500).send('Server error');
        });
    }).catch((err) => {
        res.status(500).send('Server error');
    })
});
//--------CHANGE PASSWORD---------------------------------------

//--------DELETE GENERAL NOTIFICATION---------------------------------------
//only admin can delete general notifications
app.post('/home/delete', (req,res) => {

    deleteGeneral(req.body.name).then( (result) => {
        res.status(200).json(result);
    }).catch((err) => {
        res.status(500).send('Server error');
    });
});
//--------DELETE GENERAL NOTIFICATION---------------------------------------

//--------DELETE SPECIAL NOTIFICATION---------------------------------------
//only admin can delete general notifications
app.post('/notifications/delete', (req,res) => {

    deleteSpecial(req.body.name).then( (result) => {
        res.status(200).json(result);
    }).catch((err) => {
        res.status(500).send('Server error');
    });
});
//--------DELETE SPECIAL NOTIFICATION---------------------------------------

//--------ADD GENERAL NOTIFICATION---------------------------------------
//only admin can add general notifications
app.post('/home/add', (req,res) => {

    let userData = {
        "name": req.body.name,
        "description": req.body.description
    };

    addGeneral(userData).then((result) => {
        res.status(200).json(result);
    }).catch((err) => {
        res.status(500).send('Server error');
    });

});
//--------ADD GENERAL NOTIFICATION---------------------------------------

//--------ADD SPECIAL NOTIFICATION---------------------------------------
//only admin can add general notifications
app.post('/notifications/add', (req,res) => {

    let userData = {
        "name": req.body.name,
        "description": req.body.description
    };

    addSpecial(userData).then((result) => {
        res.status(200).json(result);
    }).catch((err) => {
        res.status(500).send('Server error');
    });

});
//--------ADD SPECIAL NOTIFICATION---------------------------------------