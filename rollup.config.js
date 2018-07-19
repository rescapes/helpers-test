import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import replace from 'rollup-plugin-replace';
import uglify from 'rollup-plugin-uglify';
import json from 'rollup-plugin-json';
import commonjs from 'rollup-plugin-commonjs';
import builtins from 'rollup-plugin-node-builtins';
import autoExternal from 'rollup-plugin-auto-external';

const env = process.env.NODE_ENV;
const config = {
  input: [
    'src/index.js',
    'src/apolloContainerTestHelpers.js',
    'src/componentHelpers.js',
    'src/componentTestHelpers.js',
    'src/styleHelpers',
    'src/svgComponentHelpers'
  ],
  plugins: [
    // Automatically exclude dependencies and peerDependencies from cjs and es builds, (and excludes
    // peerDependencies from all builds)
    autoExternal(),
    /*
      I don't know if any of this stuff is still needed
    json(),
    builtins(),
    nodeResolve({
      preferBuiltins: true,
      jsnext: true,
      extensions: ['.ts', '.js', '.json']
    }),
    commonjs({
      include: [
        'node_modules/**'
      ],
      exclude: [
        'node_modules/process-es6/**'
      ],
      namedExports: {
        'node_modules/react/index.js': ['Children', 'Component', 'PropTypes', 'createElement', 'createFactory'],
        'node_modules/react-dom/index.js': ['render'],
        'node_modules/graphql/execution/index.js': [
          'execute', 'defaultFieldResolver', 'responsePathAsArray', 'getDirectiveValues'
        ],
        'node_modules/graphql/type/index.js': [
          'GraphQLSchema',
          'GraphQLScalarType', 'GraphQLObjectType', 'GraphQLInterfaceType', 'GraphQLUnionType', 'GraphQLEnumType', 'GraphQLInputObjectType', 'GraphQLList', 'GraphQLNonNull', 'GraphQLDirective',
          'TypeKind',
          'specifiedScalarTypes', 'GraphQLInt', 'GraphQLFloat', 'GraphQLString', 'GraphQLBoolean', 'GraphQLID',
          'specifiedDirectives', 'GraphQLIncludeDirective', 'GraphQLSkipDirective', 'GraphQLDeprecatedDirective',
          'DEFAULT_DEPRECATION_REASON',
          'SchemaMetaFieldDef', 'TypeMetaFieldDef', 'TypeNameMetaFieldDef',
          'introspectionTypes', '__Schema', '__Directive', '__DirectiveLocation', '__Type', '__Field', '__InputValue', '__EnumValue', '__TypeKind',
          'isSchema', 'isDirective', 'isType', 'isScalarType', 'isObjectType', 'isInterfaceType', 'isUnionType', 'isEnumType', 'isInputObjectType', 'isListType', 'isNonNullType', 'isInputType', 'isOutputType', 'isLeafType', 'isCompositeType', 'isAbstractType', 'isWrappingType', 'isNullableType', 'isNamedType', 'isSpecifiedScalarType', 'isIntrospectionType', 'isSpecifiedDirective',
          'assertType', 'assertScalarType', 'assertObjectType', 'assertInterfaceType', 'assertUnionType', 'assertEnumType', 'assertInputObjectType', 'assertListType', 'assertNonNullType', 'assertInputType', 'assertOutputType', 'assertLeafType', 'assertCompositeType', 'assertAbstractType', 'assertWrappingType', 'assertNullableType', 'assertNamedType',
          'getNullableType', 'getNamedType',
          'validateSchema', 'assertValidSchema'
        ],
        'node_modules/graphql/language/index.js': ['Source', 'getLocation', 'parse', 'parseValue', 'parseType', 'print',
          'visit', 'visitInParallel', 'visitWithTypeInfo', 'getVisitFn', 'Kind', 'TokenKind', 'DirectiveLocation', 'BREAK'
        ],
        'node_modules/graphql/subscription/index.js': [
          'subscribe', 'createSourceEventStream'
        ],
        'node_modules/graphql/validation/index.js': [
          'validate', 'ValidationContext', 'specifiedRules',
          'FieldsOnCorrectTypeRule', 'FragmentsOnCompositeTypesRule', 'KnownArgumentNamesRule', 'KnownDirectivesRule', 'KnownFragmentNamesRule', 'KnownTypeNamesRule', 'LoneAnonymousOperationRule', 'NoFragmentCyclesRule', 'NoUndefinedVariablesRule', 'NoUnusedFragmentsRule', 'NoUnusedVariablesRule', 'OverlappingFieldsCanBeMergedRule', 'PossibleFragmentSpreadsRule', 'ProvidedNonNullArgumentsRule', 'ScalarLeafsRule', 'SingleFieldSubscriptionsRule', 'UniqueArgumentNamesRule', 'UniqueDirectivesPerLocationRule', 'UniqueFragmentNamesRule', 'UniqueInputFieldNamesRule', 'UniqueOperationNamesRule', 'UniqueVariableNamesRule', 'ValuesOfCorrectTypeRule', 'VariablesAreInputTypesRule', 'VariablesDefaultValueAllowedRule', 'VariablesInAllowedPositionRule'
        ],
        'node_modules/graphql/error/index.js': [
          'GraphQLError', 'formatError', 'printError'
        ],
        'node_modules/graphql/utilities/index.js': [
          'getIntrospectionQuery', 'introspectionQuery', 'getOperationAST', 'introspectionFromSchema', 'buildClientSchema', 'buildASTSchema,'
        ],
        'node_modules/apollo-test-utils/dist/src/index.js': [
          'mockNetworkInterfaceWithSchema'
        ]
      }
    })
  */
  ],
  experimentalCodeSplitting: true
};

if (env === 'es' || env === 'cjs') {
  config.output = {
    dir: env,
    format: env,
    indent: false,
    sourcemap: 'inline'
  };
  // folktale needs to be explicitly external because rollup can't
  // match folktale to folktale/concurrency/task
  // enzyme and enzyme-wait are dev-dependencies that are used by componentTestHelpers, so mark external here
  config.external = ['symbol-observable', 'folktale/concurrency/task', 'folktale/result', 'enzyme', 'enzyme-wait']
  config.plugins.push(
    babel({
      exclude: ['node_modules/**'],
      plugins: ['external-helpers']
    })
  );
}

if (env === 'development' || env === 'production') {
  config.output = {
    dir: 'umd',
    format: 'umd',
    name: 'Umd',
    indent: false
  };
  config.plugins.push(
    nodeResolve({
      jsnext: true
    }),
    babel({
      exclude: 'node_modules/**',
      plugins: ['external-helpers']
    }),
    replace({
      'process.env.NODE_ENV': JSON.stringify(env)
    })
  );
}

if (env === 'production') {
  config.plugins.push(
    uglify({
      compress: {
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
        warnings: false
      }
    })
  );
}

export default config;