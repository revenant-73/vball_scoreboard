(function(root){
 function classify(dx,dy,elapsed){
  const x=Math.abs(dx),y=Math.abs(dy);
  if(elapsed>1500)return {type:'none'};
  if(x>=60&&x>y*1.4)return {type:'mode',delta:dx<0?1:-1};
  if(y>=40&&y>x*1.4)return {type:'score',delta:dy<0?1:-1};
  if(x<=12&&y<=12&&elapsed<650)return {type:'tap'};
  return {type:'none'};
 }
 const api={classify};if(typeof module!=='undefined')module.exports=api;else root.GymTouch=api;
})(typeof window!=='undefined'?window:globalThis);
