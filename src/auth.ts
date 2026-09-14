import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {nanoid} from 'nanoid';
import {createUser,userByEmail,userById} from './db.js';
export type AuthUser = { id: string; name: string; email: string };
const secret=()=>{if(!process.env.JWT_SECRET)throw new Error('JWT_SECRET missing');return process.env.JWT_SECRET};
export async function signup(name:string,email:string,password:string){if(password.length<8)throw new Error('Password must be at least 8 characters');if(await userByEmail(email))throw new Error('Email already registered');const id=nanoid(16);const hash=await bcrypt.hash(password,12);await createUser(id,name.trim(),email.trim().toLowerCase(),hash);return issue({id,name:name.trim(),email:email.trim().toLowerCase()});}
export async function login(email:string,password:string){const u=await userByEmail(email);if(!u||!(await bcrypt.compare(password,u.password_hash)))throw new Error('Invalid email or password');return issue({id:u.id,name:u.name,email:u.email});}
export async function verify(req:any): Promise<AuthUser | null>{const h=String(req.headers.authorization||'');if(!h.startsWith('Bearer '))return null;try{const p:any=jwt.verify(h.slice(7),secret());const u=await userById(String(p.sub));if(!u)return null;return {id:u.id,name:u.name,email:u.email};}catch{return null}}
function issue(user:AuthUser){const accessToken=jwt.sign({sub:user.id},secret(),{expiresIn:'30d'});return {accessToken,user};}
