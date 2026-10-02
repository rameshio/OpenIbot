import type {AppState} from './types';

export function mainBot(state:Pick<AppState,'bots'|'mainBotId'>){
 return state.bots.find(bot=>bot.id===state.mainBotId)??state.bots.find(bot=>bot.id==='chief')??state.bots[0];
}
