import {createPublicServer} from './server/public-access.mjs';
import {createAppServer} from './server.mjs';
import {ConnectorError,EcoleDirecteConnector} from './server/connector.mjs';
import {homeworkAnswer} from './server/tutor.mjs';
const port=Number(process.env.PORT||10000);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT invalide.');
const origin=process.env.RENDER_EXTERNAL_URL||process.env.REPERE_PUBLIC_URL;
if(!origin)throw new Error('RENDER_EXTERNAL_URL ou REPERE_PUBLIC_URL doit contenir l’origine HTTPS du site.');
const cloudTutor={
 async status(){return {mode:'browser',available:true,visionAvailable:true,fastAvailable:true,message:'L’assistant gratuit fonctionne dans votre navigateur.'};},
 async generate(input,{planner}){
  const direct=['advice','chat'].includes(input.kind)&&homeworkAnswer(input.question||'',planner);
  if(direct)return direct;
  throw new ConnectorError('TUTOR_NOT_HOSTED','Recharge la page pour utiliser l’assistant gratuit dans ton navigateur.',503);
 }
};
const diagnostic=event=>console.info('ED_DIAGNOSTIC '+JSON.stringify(event));
const connectorFactory=()=>new EcoleDirecteConnector({diagnostic});
const server=await createPublicServer({origin,appFactory:()=>createAppServer({tutor:cloudTutor,connectorFactory})});
server.on('error',error=>{console.error('Démarrage impossible : '+error.code);process.exitCode=1;});
server.listen(port,'0.0.0.0',()=>console.log('Repère en ligne. Les données scolaires nécessitent une connexion ÉcoleDirecte.'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.closeAllConnections();server.close(()=>process.exit(0));});
const probe=connectorFactory();
probe.request('login.awp?gtk=1',{bootstrap:true}).catch(()=>{}).finally(()=>probe.clear());
