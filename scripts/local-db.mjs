import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
export function localDB(path=':memory:'){
 const db=new DatabaseSync(path);
 db.exec(readFileSync(new URL('../drizzle/0000_remote_rooms.sql',import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));
 const statement=(sql,values=[])=>({
  bind(...args){return statement(sql,args);},
  async first(){return db.prepare(sql).get(...values)||null;},
  async run(){const result=db.prepare(sql).run(...values);return {meta:{changes:Number(result.changes)}};}
 });
 return {prepare:statement,async batch(items){db.exec('BEGIN');try{const result=[];for(const item of items)result.push(await item.run());db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}},close(){db.close();}};
}
