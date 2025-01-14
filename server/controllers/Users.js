
import Users from "../models/UserModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const getUsers = async(req,res) =>{
    try{
        const users = await Users.findAll({
            attributes: ['id', 'name', 'email']
        });
        res.json(users);
    }catch (error){
        console.log(error);
    }
}

export const Register = async(req, res) =>{
    console.log("Request body: ", req.body);
    const { full_name, username, email, phone_number, password_hash } = req.body;

    if (!full_name || !username || !email || !phone_number ||!password_hash) {
        return res.status(400).json({ msg: "Semua data wajib diisi" });
    }
    // if(password !== confPassword){
    //     return res.status(400).json({msg: "Password dan Confirm Password tidak cocok"});
    // }

    const salt = await bcrypt.genSalt();
    const hashPassword = await bcrypt.hash(password, salt);

    try {
        await Users.create({
            full_name:full_name,
            username:username,
            email: email,
            phone_number:phone_number,
            password:password_hash
        });
        res.json({msg: "Registrasi Berhasil"});
    } catch (error) {
        console.log(error);    
    }
};

export const Login = async(req, res) =>{
    try {
        const user = await Users.findAll({
            where:{
                email: req.body.email
            }
        });
        const match = await bcrypt.compare(req.body.password, user[0].password);
        if(!match) return res.status(400).json({msg: "Wrong Password"});
        const userId = user[0].id;
        const name = user[0].name;
        const email = user[0].email;
        const accesToken = jwt.sign({userId, name, email}, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: '20s'
        });
        const refreshToken = jwt.sign({userId, name, email}, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: '1d'
        });
        await Users.update({refresh_token: refreshToken},{
            where:{
                id: userId
            }
        });
        res.cookie('refreshToken', refreshToken,{
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000
            // secure: true // kalo make https
        });
        res.json({ accesToken});
    } catch (error) {
        res.status(404).json({msg: "Email tidak ditemukan"});
    }
}

export const Logout = async(req, res)=>{
    const refreshToken = req.cookies.refreshToken;
        if(!refreshToken) return res.sendStatus(401);
        const user = await Users.findAll({
            where:{
                refresh_token: refreshToken
            }
        });
        if(!user[0]) return res,sendStatus(204);
        const userId = user[0].id;
        await Users.update({refresh_token: null},{
            where:{
                id:userId
            }
        });
        res.clearCookie('refreshToken');
        return res.sendStatus(200);
}
