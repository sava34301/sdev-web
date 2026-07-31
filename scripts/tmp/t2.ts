import { execute } from '../../src/lang';
const p=`forge t be {}
speak(str(measure("hey")))
speak(str(t["a"] equals void))
speak(str(ord("hey",1)))
set t["x"] to 5
speak(str(t["x"]))`;
console.log(execute(p));
