# vue3

## 打包编译过程

### node 执行 scripts/dev.js

- 如果没有设置入口，默认是 vue
- 打包格式默认是 global
- 是否开启 sourcemap
- 使用 rollup 替换之前 flow 进行静态语法校验和编译打包

```js
const execa = require("execa");
const { fuzzyMatchTarget } = require("./utils");
const args = require("minimist")(process.argv.slice(2));
// 默认编译文件名
const target = args._.length ? fuzzyMatchTarget(args._)[0] : "vue";
const formats = args.formats || args.f;
const sourceMap = args.sourcemap || args.s;
const commit = execa.sync("git", ["rev-parse", "HEAD"]).stdout.slice(0, 7);

execa(
  "rollup",
  [
    "-wc",
    "--environment",
    [
      `COMMIT:${commit}`,
      `TARGET:${target}`,
      `FORMATS:${formats || "global"}`,
      sourceMap ? `SOURCE_MAP:true` : ``,
    ]
      .filter(Boolean)
      .join(","),
  ],
  {
    stdio: "inherit",
  }
);
```

### rollup.config.js 配置文件

- 根据 dev 传入的参数可知 process.env.TARGET 为 vue process.env.FORMATS 为 global
- 最后导出打包配置 packageConfigs
- 特别注意下打包入口最终地址 entryFile = /runtime$/.test(format) ? `src/runtime.ts` : `src/index.ts`
- 因为 format 为 global 故是 src/index.ts

```js
const masterVersion = require("./package.json").version;
const packagesDir = path.resolve(__dirname, "packages");
const packageDir = path.resolve(packagesDir, process.env.TARGET);
const name = path.basename(packageDir);
const resolve = (p) => path.resolve(packageDir, p);
const pkg = require(resolve(`package.json`));
const packageOptions = pkg.buildOptions || {};

const outputConfigs = {
  "esm-bundler": {
    file: resolve(`dist/${name}.esm-bundler.js`),
    format: `es`,
  },
  "esm-browser": {
    file: resolve(`dist/${name}.esm-browser.js`),
    format: `es`,
  },
  cjs: {
    file: resolve(`dist/${name}.cjs.js`),
    format: `cjs`,
  },
  global: {
    file: resolve(`dist/${name}.global.js`),
    format: `iife`,
  },

  // runtime-only builds, for main "vue" package only
  "esm-bundler-runtime": {
    file: resolve(`dist/${name}.runtime.esm-bundler.js`),
    format: `es`,
  },
  "esm-browser-runtime": {
    file: resolve(`dist/${name}.runtime.esm-browser.js`),
    format: "es",
  },
  "global-runtime": {
    file: resolve(`dist/${name}.runtime.global.js`),
    format: "iife",
  },
};

const defaultFormats = ["esm-bundler", "cjs"];
const inlineFormats = process.env.FORMATS && process.env.FORMATS.split(",");
const packageFormats =
  inlineFormats || packageOptions.formats || defaultFormats;
const packageConfigs = process.env.PROD_ONLY
  ? []
  : packageFormats.map((format) => createConfig(format, outputConfigs[format]));

export default packageConfigs;

function createConfig(format, output, plugins = []) {
  if (!output) {
    console.log(require("chalk").yellow(`invalid format: "${format}"`));
    process.exit(1);
  }

  output.sourcemap = !!process.env.SOURCE_MAP;
  output.externalLiveBindings = false;

  const isProductionBuild =
    process.env.__DEV__ === "false" || /\.prod\.js$/.test(output.file);
  const isBundlerESMBuild = /esm-bundler/.test(format);
  const isBrowserESMBuild = /esm-browser/.test(format);
  const isNodeBuild = format === "cjs";
  const isGlobalBuild = /global/.test(format);

  if (isGlobalBuild) {
    output.name = packageOptions.name;
  }

  const shouldEmitDeclarations = process.env.TYPES != null && !hasTSChecked;

  const tsPlugin = ts({
    check: process.env.NODE_ENV === "production" && !hasTSChecked,
    tsconfig: path.resolve(__dirname, "tsconfig.json"),
    cacheRoot: path.resolve(__dirname, "node_modules/.rts2_cache"),
    tsconfigOverride: {
      compilerOptions: {
        sourceMap: output.sourcemap,
        declaration: shouldEmitDeclarations,
        declarationMap: shouldEmitDeclarations,
      },
      exclude: ["**/__tests__", "test-dts"],
    },
  });
  // we only need to check TS and generate declarations once for each build.
  // it also seems to run into weird issues when checking multiple times
  // during a single build.
  hasTSChecked = true;

  const entryFile = /runtime$/.test(format) ? `src/runtime.ts` : `src/index.ts`;

  const external =
    isGlobalBuild || isBrowserESMBuild
      ? packageOptions.enableNonBrowserBranches
        ? // externalize postcss for @vue/compiler-sfc
          // because @rollup/plugin-commonjs cannot bundle it properly
          ["postcss"]
        : // normal browser builds - non-browser only imports are tree-shaken,
          // they are only listed here to suppress warnings.
          ["source-map", "@babel/parser", "estree-walker"]
      : // Node / esm-bundler builds. Externalize everything.
        [
          ...Object.keys(pkg.dependencies || {}),
          ...Object.keys(pkg.peerDependencies || {}),
          ...["path", "url", "stream"], // for @vue/compiler-sfc / server-renderer
        ];

  // the browser builds of @vue/compiler-sfc requires postcss to be available
  // as a global (e.g. http://wzrd.in/standalone/postcss)
  output.globals = {
    postcss: "postcss",
  };

  const nodePlugins =
    packageOptions.enableNonBrowserBranches && format !== "cjs"
      ? [
          require("@rollup/plugin-node-resolve").nodeResolve({
            preferBuiltins: true,
          }),
          require("@rollup/plugin-commonjs")({
            sourceMap: false,
          }),
          require("rollup-plugin-node-builtins")(),
          require("rollup-plugin-node-globals")(),
        ]
      : [];

  return {
    input: resolve(entryFile),
    // Global and Browser ESM builds inlines everything so that they can be
    // used alone.
    external,
    plugins: [
      json({
        namedExports: false,
      }),
      tsPlugin,
      createReplacePlugin(
        isProductionBuild,
        isBundlerESMBuild,
        isBrowserESMBuild,
        // isBrowserBuild?
        (isGlobalBuild || isBrowserESMBuild || isBundlerESMBuild) &&
          !packageOptions.enableNonBrowserBranches,
        isGlobalBuild,
        isNodeBuild
      ),
      ...nodePlugins,
      ...plugins,
    ],
    output,
    onwarn: (msg, warn) => {
      if (!/Circular/.test(msg)) {
        warn(msg);
      }
    },
    treeshake: {
      moduleSideEffects: false,
    },
  };
}
```

## vue 初始化过程

### vue2 初始化通过 new 一个实例

```js
// 将实例挂载到#app的dom节点上，如果提供el，则挂载到el中
// 如果提供了template则作为渲染函数，如果没有提供则把el对应的html内容作为渲染模板

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount("#app");
```

### vue3 初始化，通过内置函数 createApp 完成创建的

- 通过 mount 方法实例渲染
- 全局方法通过对象方式调用，避免全局配置污染，方便 treeshaking，更加语义化

### createApp 具体实现是怎么样的

- createApp 是通过 ensureRenderer 函数返回的 renderer 对象

```js
function ensureRenderer() {
  return renderer || (renderer = createRenderer(rendererOptions));
}

const app = ensureRenderer().createApp(...args);
{
  injectNativeTagCheck(app);
}
const { mount } = app;
app.mount = (containerOrSelector) => {
  const container = normalizeContainer(containerOrSelector);
  if (!container) return;
  const component = app._component;
  if (!isFunction(component) && !component.render && !component.template) {
    component.template = container.innerHTML;
  }
  // clear content before mounting
  container.innerHTML = "";
  const proxy = mount(container);
  if (container instanceof Element) {
    container.removeAttribute("v-cloak");
    container.setAttribute("data-v-app", "");
  }
  return proxy;
};
return app;
```

- renderer 对象又是通过 createRenderer 方法返回的
- createRenderer 方法里面调用的是 baseCreateRenderer
- 可以看到 createApp 又是通过 createAppAPI 函数创建

```js
function baseCreateRenderer(options, createHydrationFns) {
  // ....省略部分

  const render = (vnode, container) => {
    if (vnode == null) {
      if (container._vnode) {
        unmount(container._vnode, null, null, true);
      }
    } else {
      patch(container._vnode || null, vnode, container);
    }
    flushPostFlushCbs();
    container._vnode = vnode;
  };
  return {
    render,
    hydrate,
    createApp: createAppAPI(render, hydrate),
  };
}
```

- 看看 createAppAPI 的代码实现

```js
let uid$1 = 0;
function createAppAPI(render, hydrate) {
  return function createApp(rootComponent, rootProps = null) {
    if (rootProps != null && !isObject(rootProps)) {
      warn(`root props passed to app.mount() must be an object.`);
      rootProps = null;
    }
    const context = createAppContext();
    const installedPlugins = new Set();
    let isMounted = false;
    const app = (context.app = {
      _uid: uid$1++,
      _component: rootComponent,
      _props: rootProps,
      _container: null,
      _context: context,
      version,
      get config() {
        return context.config;
      },
      set config(v) {
        {
          warn(
            `app.config cannot be replaced. Modify individual options instead.`
          );
        }
      },
      use(plugin, ...options) {
        if (installedPlugins.has(plugin)) {
          warn(`Plugin has already been applied to target app.`);
        } else if (plugin && isFunction(plugin.install)) {
          installedPlugins.add(plugin);
          plugin.install(app, ...options);
        } else if (isFunction(plugin)) {
          installedPlugins.add(plugin);
          plugin(app, ...options);
        } else {
          warn(
            `A plugin must either be a function or an object with an "install" ` +
              `function.`
          );
        }
        return app;
      },
      mixin(mixin) {
        {
          if (!context.mixins.includes(mixin)) {
            context.mixins.push(mixin);
            // global mixin with props/emits de-optimizes props/emits
            // normalization caching.
            if (mixin.props || mixin.emits) {
              context.deopt = true;
            }
          } else {
            warn(
              "Mixin has already been applied to target app" +
                (mixin.name ? `: ${mixin.name}` : "")
            );
          }
        }
        return app;
      },
      component(name, component) {
        {
          validateComponentName(name, context.config);
        }
        if (!component) {
          return context.components[name];
        }
        if (context.components[name]) {
          warn(
            `Component "${name}" has already been registered in target app.`
          );
        }
        context.components[name] = component;
        return app;
      },
      directive(name, directive) {
        {
          validateDirectiveName(name);
        }
        if (!directive) {
          return context.directives[name];
        }
        if (context.directives[name]) {
          warn(
            `Directive "${name}" has already been registered in target app.`
          );
        }
        context.directives[name] = directive;
        return app;
      },
      mount(rootContainer, isHydrate) {
        if (!isMounted) {
          const vnode = createVNode(rootComponent, rootProps);
          // store app context on the root VNode.
          // this will be set on the root instance on initial mount.
          vnode.appContext = context;
          // HMR root reload
          {
            context.reload = () => {
              render(cloneVNode(vnode), rootContainer);
            };
          }
          if (isHydrate && hydrate) {
            hydrate(vnode, rootContainer);
          } else {
            render(vnode, rootContainer);
          }
          isMounted = true;
          app._container = rootContainer;
          rootContainer.__vue_app__ = app;
          {
            devtoolsInitApp(app, version);
          }
          return vnode.component.proxy;
        } else {
          warn(
            `App has already been mounted.\n` +
              `If you want to remount the same app, move your app creation logic ` +
              `into a factory function and create fresh app instances for each ` +
              `mount - e.g. \`const createMyApp = () => createApp(App)\``
          );
        }
      },
      unmount() {
        if (isMounted) {
          render(null, app._container);
          {
            devtoolsUnmountApp(app);
          }
          delete app._container.__vue_app__;
        } else {
          warn(`Cannot unmount an app that is not mounted.`);
        }
      },
      provide(key, value) {
        if (key in context.provides) {
          warn(
            `App already provides property with key "${String(key)}". ` +
              `It will be overwritten with the new value.`
          );
        }
        // TypeScript doesn't allow symbols as index type
        // https://github.com/Microsoft/TypeScript/issues/24587
        context.provides[key] = value;
        return app;
      },
    });
    return app;
  };
}
```

- 以上就是 vue 初始化部分，做个简单汇总
- 通过 createApp 返回 vue 对象
- createApp => ensureRenderer => createRenderer => baseCreateRenderer => createAppAPI
- 手写这一初始化过程 详见：exmaple/demo2.html
- 自定义 createRenderer 详见：exmaple/demo3-canvas.html

## 数据可观测

### vue2通过Object.defineProperty()，存在以下缺点

- 需要实现一个数据拦截方法defineReactive
- 首次加载，需要遍历并递归所有的属性值，会消耗大量内存
- 针对数组需要提供额外的拦截方法
- es6新的数据结构无法监听，像set，map，symbol
- 后面新增的属性和删除属性，需要额外api来完成

### vue3使用Proxy完成数据的观测，有以下优点

- 新增属性和删除属性都能监听
- 可以代理任何对象
- 数据拦截优化了，不需要全部遍历

### vue3依赖收集

1. 初始化阶段： 初始化阶段通过组件初始化方法形成对应的proxy对象，然后形成一个负责渲染的effect。
2. get依赖收集阶段：通过解析template，替换真实data属性，来触发get,然后通过stack方法，通过proxy对象和key形成对应的deps，将负责渲染的effect存入deps。（这个过程还有其他的effect，比如watchEffect存入deps中 ）。
3. set派发更新阶段：当我们 this[key] = value 改变属性的时候，首先通过trigger方法，通过proxy对象和key找到对应的deps，然后给deps分类分成computedRunners和effect,然后依次执行，如果需要调度的，直接放入调度。

手写一个简单数据检测函数 详见：exmaple/demo4.html

### vue3的虚拟dom渲染和diff过程

1. createAppAPI => mount => createVNode 生成vnode，初步返回一个js对象结构，包含
2. 开始渲染vnode，createAppAPI => mount => render
3. 首次进入patch函数，通过container._vnode是否为空
4. 通过vnode.shapeFlag为4，进入实例化组件processComponent => mountComponent
5. mountComponent在setupComponent过程中，给instance添加渲染函数
6. setupRenderEffect安装副作用函数
7. renderComponentRoot 递归获取全局子树
8. 再次执行patch，递归渲染这棵subtree
9. 更新时，触发trigger => effect => patch

详见：exmaple/demo5.html