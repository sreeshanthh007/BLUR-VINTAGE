
// user register 
loadRegister = async (req,res)=>{
    try{
        return res.render('register');
    }catch(err){
        console.log("register not found");
        res.status(500).send("server error");
    }
}

// user login

loadLogin = async (req,res)=>{
    try{
        return res.render('login')
    }catch(err){
        console.log('login page not found');
        res.status(500).send("server error")
    }
}
 
//  user homepage

loadHome = async (req,res)=>{
    try{
        return res.render('userhome');
    }catch(err){
        console.log("page not found");
        res.status(500).send("server error")
    }
}
// page not found

pagenotFound = (req,res)=>{
    try{
        return res.render("notFound")
    }catch(err){
        console.log("page not found");
        res.redirect('/pagenotFound')
    }
}
module.exports={
    loadRegister,
    loadLogin,
    loadHome,
    pagenotFound
}