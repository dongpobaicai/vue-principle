
/**
 * vue编译阶段，通过命令行参数来区分
 */
let builds = require('./config').getAllBuilds()
if (process.argv[2]) {
  console.log('存在参数')
  const filters = process.argv[2].split(',')
  builds = builds.filter(b => {
    return filters.some(f => b.output.file.indexOf(f) > -1 || b._name.indexOf(f) > -1)
  })
} else {
  console.log('没有参数')
  // filter out weex builds by default
  builds = builds.filter(b => {
    return b.output.file.indexOf('weex') === -1
  })
}