import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
const base='4d4b498fc6d99bec5561f068b5d2489a6c1d02c1';
const before=execFileSync('git',['show',`${base}:app/account.tsx`],{encoding:'utf8'});
const after=readFileSync(new URL('../../app/account.tsx',import.meta.url),'utf8');
const original="Platform.OS === 'ios' ? 'interactive' : 'on-drag'";
const revised="Platform.OS === 'web' ? 'none' : Platform.OS === 'ios' ? 'interactive' : 'on-drag'";
function scrollProps(source) {
  const tree=ts.createSourceFile('account.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let props;
  function visit(node){
    if(ts.isJsxOpeningElement(node)&&node.tagName.getText(tree)==='ScrollView'){
      props=new Map(node.attributes.properties.filter(ts.isJsxAttribute).map(attr=>[attr.name.getText(tree),attr.initializer]));
    }
    ts.forEachChild(node,visit);
  }
  visit(tree); assert.ok(props);return {tree,props};
}
test('AccountScreen changes only web dismissal, preserving focus scheduling and every other prop',()=>{
  assert.equal(after,before.replace(`keyboardDismissMode={${original}}`,`keyboardDismissMode={${revised}}`));
});
for(const [os,expected] of [['web','none'],['ios','interactive'],['android','on-drag']])test(`${os} source dismissal contract`,()=>{
  const {tree,props}=scrollProps(after);
  const initializer=props.get('keyboardDismissMode');assert.ok(ts.isJsxExpression(initializer));
  const expression=initializer.expression.getText(tree);
  assert.equal(Function('Platform',`return (${expression})`)({OS:os}),expected);
  assert.equal(props.get('keyboardShouldPersistTaps').text,'handled');
});
for(const file of ['scripts/commercial-browser-input-checker.mjs','scripts/commercial-browser-input-checker.test.mjs','utils/focusVisibility.ts','hooks/useAndroidKeyboardInset.ts'])test(`${file} unchanged`,()=>{
  assert.equal(readFileSync(new URL(`../../${file}`,import.meta.url),'utf8'),execFileSync('git',['show',`${base}:${file}`],{encoding:'utf8'}));
});
