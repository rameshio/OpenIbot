import test from 'node:test';
import assert from 'node:assert/strict';
import {desktopCommand} from '../desktop/desktop-broker';
test('desktop broker uses typed argv and rejects shell execution and invalid browser targets',()=>{
 assert.deepEqual(desktopCommand({action:'type',text:'$(cat secret); rm -rf /'}),['xdotool','type','--clearmodifiers','--','$(cat secret); rm -rf /']);
 assert.deepEqual(desktopCommand({action:'click',x:20,y:40}),['xdotool','mousemove','20','40','click','1']);
 assert.deepEqual(desktopCommand({action:'open',url:'https://example.com/'}),['xdg-open','https://example.com/']);
 for(const value of [{action:'exec',text:'cat secret'},{action:'open',url:'file:///home/bot/.vnc/passwd'},{action:'open',url:'https://user:secret@example.com'},{action:'click',x:-1,y:0},{action:'key',text:'Return; cat secret'}])assert.throws(()=>desktopCommand(value));
});
