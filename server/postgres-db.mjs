// Keep the existing, tested session API portable between D1/SQLite and Postgres.
// Only parameter placeholders and INSERT's conflict syntax differ here.
export function createPostgresDB(pool) {
 const convert=sql=>{
  let index=0;
  const insert=sql.startsWith('INSERT OR IGNORE INTO ');
  return sql.replace(/^INSERT OR IGNORE INTO /,'INSERT INTO ').replaceAll('?',()=>'$'+(++index))+(insert?' ON CONFLICT (code) DO NOTHING':'');
 };
 const normalize=row=>row?{...row,expires_at:Number(row.expires_at)}:null;
 const prepare=(sql,values=[])=>({
  sql:convert(sql),values,
  bind(...args){return prepare(sql,args);},
  async first(){const result=await pool.query(this.sql,values);return normalize(result.rows[0]);},
  async run(){const result=await pool.query(this.sql,values);return {meta:{changes:result.rowCount}};}
 });
 return {
  prepare,
  async batch(items){
   const client=await pool.connect();
   try{
    await client.query('BEGIN');
    const results=[];
    for(const item of items){const result=await client.query(item.sql,item.values);results.push({meta:{changes:result.rowCount}});}
    await client.query('COMMIT');return results;
   }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  }
 };
}
