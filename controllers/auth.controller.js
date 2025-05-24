import User from '../models/user.model.js'
import { getUser, setUser } from '../services/auth.service.js'
import bcrypt from 'bcrypt'

export async function handleUserSignUp(req, res) {
  try {
    //extract user info 
    const { name, email, password } = req.body

    // check if user exits
    const checkExistingUser = await User.findOne({ email })

    if (checkExistingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with email already exist'
      })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    })
    await newUser.save()

    newUser.password = undefined

    if (newUser) {
      res.status(201).json({
        success: true,
        message: "user registered successfully",
        data: newUser
      })
    } else {
      res.status(400).json({
        success: false,
        message: "unable to register user. please try again later!"
      })
    }
  } catch (error) {
    console.error("signup error : ", error)
    res.status(500).json({
      success: false,
      message: 'something went wrong. please try again later!'
    })
  }
}

export async function handleUserLogin(req, res) {
  try {
    // extract user info
    const { email, password, rememberMe } = req.body

    //find if user exist
    const user = await User.findOne({ email })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "user does not exist. register to continue!"
      })
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password)

    if (!isPasswordMatch) {
      return res.status(400).json({
        success: false,
        message: "incorrect password!"
      })
    }

    const token = setUser(user)

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      path: "/",
    };

    if (rememberMe) {
      cookieOptions.maxAge = 10 * 365 * 24 * 60 * 60 * 1000;
    }

    res.cookie('uid', token, cookieOptions)

    user.password = undefined
    return res.status(200).json({
      success: true,
      message: 'login successfull!',
      user,
      token
    })

  } catch (error) {
    console.error("login error : ", error)
    res.status(500).json({
      success: false,
      message: 'something went wrong. please try again later!'
    })
  }
}


export async function getCurrentUser(req, res) {
  try {
    const token = req.cookies?.uid

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      })
    }

    const user = getUser(token)

    if(!user) {
      return res.status(401).json({
        success : false,
        message : "Session expired. Please login again."
      })
    }
    return res.status(200).json({
      success: true,
      user
    })

  } catch (error) {
    console.error("getCurrentUser error : ", error)
    return res.status(500).json({
      success: false,
      message: "something went wrong. please try again!"
    })
  }
}

export async function handleLogout(req , res) {
  try{
    const token = req.cookies?.uid;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "No active session found.",
      });
    }

    res.clearCookie("uid", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      path: "/",
    });

    res.status(200).json({
      success : true,
      message : "Logged out successfully!"
    })

  } catch(error) {
    console.error("Logout error : ",error)
    return res.status(500).json({
      success : false,
      message : "something went wrong. please try again!"
    })
  }
}