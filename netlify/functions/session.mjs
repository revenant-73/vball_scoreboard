import {getDatabase} from '@netlify/database';
import {createWorker} from '../../worker/index.mjs';
import {createPostgresDB} from '../../server/postgres-db.mjs';

const api=createWorker();
let database;
export default async request=>{
 try{
  database??=getDatabase();
  return await api.fetch(request,{DB:createPostgresDB(database.pool)});
 }catch(error){
  console.error('Session database unavailable',error.name);
  return Response.json({error:'Connection unavailable. Your last confirmed scores are safe. Try again.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
};
export const config={path:'/api/*'};
