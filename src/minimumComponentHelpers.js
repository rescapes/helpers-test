/**
 * Created by Andy Likuski on 2017.09.04
 * Copyright (c) 2017 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import React from 'react';
import * as R from 'ramda';
import {v} from 'rescape-validate';
import PropTypes from 'prop-types';
import {mergeDeep, reqPathThrowing, reqStrPathThrowing, mergeDeepWith} from 'rescape-ramda';
import * as Result from 'folktale/result';
import {getClassAndStyle, getStyleObj} from './minimumStyleHelpers';
import {graphql} from 'graphql';
import {makeTestPropsFunction} from './componentTestHelpers';

const {of, fromPromised} = require('folktale/concurrency/task');

/***
 * This file is a minimum version of rescape-helpers-component/componentHelpers.js
 * Since that package requires this one, I copied the minimum functions to here
 */

/**
 * Default statuses for Components that don't have any Apollo queries
 * @type {{loading: boolean, error: boolean}}
 */
export const loadingCompleteStatus = {
  loading: false,
  error: false,
  store: {}
};

/**
 * Returns true if the lens applied to props equals the lens applied to nextProps
 * @param {Function} lens Ramda lens
 * @param {Object|Array} props React props
 * @param {Object|Array} nextProps Reach nextProps
 * @returns {Boolean} True if equal, else false
 */
export const propLensEqual = v(R.curry((lens, props, nextProps) =>
    R.equals(
      R.view(lens, props),
      R.view(lens, nextProps)
    )
  ),
  [
    ['lens', PropTypes.func.isRequired],
    ['props', PropTypes.oneOfType([PropTypes.object, PropTypes.array]).isRequired],
    ['nextProps', PropTypes.oneOfType([PropTypes.object, PropTypes.array]).isRequired]
  ], 'propLensEqual');


/**
 * Maps each Reach element to an curried e function.
 * @param {(String|Object)} types React element types (e.g. ['div', 'svg', React])
 * @returns {Function} A list of functions that need just the config and children specified, not the type
 */
export const eMap = types => R.map(component => React.createFactory(component), types);

/**
 * Returns a function that expects props containing one of data.loading|error|store
 * If error is defined it calls onError. If loading is true it calls onLoading. If store it calls onData
 * Otherwise an exception is thrown
 * @param onError. Function expecting data and called if data.error is not null
 * @param onLoading Function expecting data and called if data.loading is true
 * @param onData Function expecting data and called if onError and onLoading are not called
 * @param props An Object that must have one of data.error|.loading|.store
 * @return {*} The result of the onError, onLoading, onData, or an Exception if none are matched
 */
export const renderChoicepoint = R.curry((onError, onLoading, onData, props) =>
  R.cond([
    [R.view(R.lensPath(['data', 'error'])), onError],
    [R.view(R.lensPath(['data', 'loading'])), onLoading],
    [R.compose(R.equals(7), R.view(R.lensPath(['data', 'networkStatus']))), onData],
    [R.T, props => {
      throw new Error(`No error, loading, nor data ready status: ${JSON.stringify(props)}`);
    }]
  ])(props)
);

/**
 * Copies any needed actions to view containers
 * Also removes ownProps from the return value since we already incorporated theses into stateProps
 * @props {Object} viewToActionNames An object keyed by view that is in stateProps.views and valued by
 * an array of action names.
 * @props {Object} props Props from a parent component
 * @returns {Function} A mergeProps function that expects props (e.g. A merge stateProps and dispatchProps)
 */
export const mergeActionsForViews = R.curry((viewToActionNames, props) => {
  return R.over(
    R.lensProp('views'),
    views =>
      mergeDeep(
        // Merge any existing values in props.views
        views,
        // Map each propPath to the value in props or undefined
        // This transforms {viewName: {propName: 'pathInPropsToPropName (e.g. store.propName)', ...}
        // This results in {viewName: {propName: propValue, ...}}
        R.map(
          actionNames =>
            R.fromPairs(R.map(
              // Create a pair [actionName, action func]
              actionName => [
                actionName,
                R.view(R.lensProp(actionName), props)
              ],
              // Within each view, map each actinoName
              actionNames)),
          // Map each view
          applyToIfFunction(props, viewToActionNames)
        )
      ),
    props
  );
});

/**
 * Given a mapping from view names to an array of prop values or functions,
 * adds or merges a views property into the props, where views is an object keyed by
 * the same keys as viewNamesToViewProps and valued by the resolution of the viewNamesToViewProps
 * This allows a Container or Component to efficiently specify which props to give the view
 * used by each sub component. Each props object of viewNamesToViewProps can be a constant value or
 * a unary function that is passed props. Result way, it results in an object keyed by props and
 * valued by prop values or a function that accepts props.
 *
 * The functions that accept props can optionally take a second argument (they must be curried) or
 * return a unary function that accepts an item. This is only appropriate for components that are
 * used in a list and so need to take each item as an argument. See the example.
 *
 * Example, if aComponent and bComponents are two child components that need the following props:
 * const viewToProps = {
 *  aComponent: {
 *    foo: 1, bar: R.lensPath(['store, 'bar'])
 * },
 * bComponent: {
 *    // These are two functions that resolve paths in different ways
 *   bar: R.lensPath(['store', 'bar']),
 *   width: (props) => props.style.width
 * }
 * // This view is used as a list item. Since all of its props need to incorporate each item we make
 * the entire property object a function
 * itemComponent: R.curry((props, item) => {
 *  // Unique key to satisfy React iteration
 *  key: item.name,
 *  title: item.title
 * })
 * // This view is also a list item, but instead uses functions on individual properties
 * anotherItemComponent: {
 *  someConstantKey: 'funky',
 *  // just needs prop
 *  somePropKey: props => props.cool
 *  // just needs item
 *  someItemProp: (_, item) => item.itemName
 *  // uses both props and item by returning a unary function
 *  anotherItemProp: props => item => `${prop.name}:${item.name}`
 * }
 *
 * and props are
 * const props = {
      a: 1,
      views: {aComponent: {stuff: 1}, bComponent: {moreStuff: 2}},
      data: {
        foo: 1,
        store: {
          bar: 2
        }
      }
      style: {
        width: '100px'
      }
    };
 * The function returns
 * {
    a: 1,
    views: {
      aComponent: {stuff: 1, foo: 1, bar: 2},
      bComponent: {moreStuff: 2, bar: 2, width: '100px'}
    },
    foo: 1,
    bar: 2,
  }
 *
 * @param {Function|Object} viewsToPropValuesOrFuncs If an object then as described above.
 * If a funciton it expects props and returns the object as described above. A function is
 * useful for generating multiple key/values
 * @param {Object} props
 * @param {Object} props.data Must be present to search for propPaths
 * @props {Object} props with props added to props.views
 */
export const mergePropsForViews = R.curry((viewNamesToViewProps, props) => {



  // If result matching view props object is a function, wrap them in a function
  // These functions have to accept an item, the props arg has already been given to them
  const mergeFunctions = (left, right) => R.ifElse(
    R.any(R.is(Function)),
    ([l, r]) => {
      return item => mergeDeep(
        ...R.map(applyToIfFunction(item), [l, r])
      );
    },
    R.apply(mergeDeep)
  )([left, right]);

  return R.over(
    R.lensProp('views'),
    views => mergeDeepWith(
      // If result merged value is a function, wrap it in a function to resolve later
      mergeFunctions,
      // Merge any existing values in props.views
      views,
      // Map each propPath to the value in props or undefined
      R.map(
        viewPropsObjOrFunction => R.map(
          // If any individual prop value is a function, pass props to it.
          applyToIfFunction(props),
          // If the viewProps are a function, pass props to it
          // Result way we end up wih an object of prop keys pointing to prop values or prop functions
          applyToIfFunction(props, viewPropsObjOrFunction)
        ),
        // If the entire viewToPropValuesOrFuncs is a function pass props to it
        applyToIfFunction(props, viewNamesToViewProps)
      )
    ),
    props
  );
});

/**
 * Adds a 'key' to the viewProps for React iteration. The value of key must be a key in viewProps
 * that generates a unique value, such as an id, name, or title. This is useful when a property created
 * in the viewProps can serve as the key
 * @param {String} keyStr Any key or keyString (e.g. 'foo.bar') in viewProps that generates a unique value
 * This will be converted to a string. If you want the key to be based on the datum use the keyWithDatum function instead
 * @param {Object} viewProps Prop configuration for a particular view (see mergePropsForViews)
 * The values can be constants or functions, as supported by mergePropsForView. The value matching
 * key will simply be referred by 'key'
 * @return {*} viewProps with 'key' added, where the value is a string or function
 */
export const keyWith = (keyStr, viewProps) => R.merge(viewProps, {
  key: reqStrPathThrowing(keyStr, viewProps).toString()
});

/**
 * Adds a 'key' to the viewProps for React iteration, where the key is property of the given datum d.
 * @param {String} keyStr Any key or key string (e.g. 'foo.bar') of d that generates a unique value
 * @param {Object} d The datum containing key, which has a unique value among the data
 * @param {Object} viewProps Prop configuration for a particular view (see mergePropsForViews)
 * The values can be constants or functions, as supported by mergePropsForView. The key value from d will
 * be merged into this, so don't put a key in the viewProps because it will be overwritten
 * @return {*} viewProps with a key property added with value d[key]
 */
export const keyWithDatum = R.curry(
  (key, d, viewProps) => R.merge(
    viewProps,
    {key: reqStrPathThrowing(key, d).toString()}
  )
);

/**
 * If maybeFunc is a func, call it with obj, otherwise return maybeFunc
 * This is somewhat like d3, where a value can be a static or a unary function
 * @param {*} obj The obj to pass to maybeFunc if maybeFunc is a function
 * @param {*} maybeFunc If a function, call it with obj, otherwise return it
 * @return {*} maybeFunc(obj) or maybeFunc
 */
export const applyToIfFunction = R.curry((obj, maybeFunc) =>
  R.ifElse(
    R.is(Function),
    // if it is function, call with props and expect a value back
    R.applyTo(obj),
    // otherwise assume it's already a resolved value
    R.identity
  )(maybeFunc)
);

/**
 * Applies the given arguments if maybeFunc is a function. Otherwise the arguments are ignored
 * @param {*} obj The obj to pass to maybeFunc if maybeFunc is a function
 * @param {*} maybeFunc If a function, call it with obj, otherwise return it
 * @return {*} maybeFunc(obj) or maybeFunc
 */
export const applyIfFunction = R.curry((args, maybeFunc) =>
  R.ifElse(
    R.is(Function),
    // if it is function, call with props and expect a value back
    R.apply(R.__, args),
    // otherwise assume it's already a resolved value
    R.identity
  )(maybeFunc)
);



/**
 * Like makeTestPropsFunction, but additionally resolves an Apollo query to supply complete data for a test
 * @param {Object} resolvedSchema Apollo schema with resolvers
 * @param {Object} sampleConfig This is used as a datasource for the resolvers
 * @param {Function} mapStateToProps Redux container function
 * @param {Function} mapDispatchToProps Redux container function
 * @param {Function} mergeProps Redux container function
 * @query {String} query Contains an apollo query string (not gql string)
 * @args {Function} args Contains an apollo query args in the format:
 * {
 *  options: { variables: { query args } }
 * }
 *
 * @returns {Function} A function with two arguments, initialState and ownProps
 *  The function returns a Task that resolves to Result.Error or Right. If Left there are errors in the Result.value. If
 *  Right then the value is the Apollo 'store' key
 */
export const makeApolloTestPropsTaskFunction = R.curry((resolvedSchema, sampleConfig, mapStateToProps, mapDispatchToProps, {query, args}) => {

  // composeK executes from right to left (bottom to top)
  return (state, props) => R.composeK(
    // Any Left will remain Left.
    // If the Right contains an error, make a Left with the error
    // Otherwise merge the results to simulate an Apollo Client return, with the results under the 'data' key
    // The results will have a store key with the loaded data
    result => of(result.chain(({props, value: {data, errors}}) => {
      if (errors)
        return Result.Error({
          error: errors
        });
      return Result.Ok(
        mergeDeep(
          props,
          {
            data: R.merge(
              // Simulate loading complete
              loadingCompleteStatus,
              data
            )
          }
        )
      );
    })),
    // Next take the merged props and call the graphql query.
    // Convert the function returning a promise to a Task
    // If if anything goes wrong wrap it in a Left. Otherwise put it in a Right
    props => {
      return fromPromised(() => graphql(
        resolvedSchema,
        query, {},
        // Resolve graphql queries with the sampleConfig
        {options: {dataSource: sampleConfig}},
        // Add data and ownProps since that is what Apollo query arguments props functions expect
        reqPathThrowing(['variables'], args.options(props))
        ).then(value => Result.Ok({value, props})
        ).catch(e => {
          return Result.Error({
            errors: [e]
          });
        })
      )();
    },
    // First create a function that expects state and props and uses them to call mapStateToProps and mapDispatchToProps
    // and merges the result. We wrap it in a task to give asynchronous function above
    (state, props) => of(makeTestPropsFunction(mapStateToProps, mapDispatchToProps)(state, props))
  )(state, props);
});

/**
 * Given a React component function that expects props and given props that are a functor (Array or Object),
 * lift the component to handle all values of the functor and then extract the values
 * @param {Function} component A React component function that expects props
 * @param {Functor} props An array or object (or any other functor for which we can extract the values
 * Each value contains the props to create on component using the component function. The results are
 * returned as an array of components
 * @return {Object[]} A list of React components
 */
export const liftAndExtract = (component, props) => {
  return R.values(
    // Note that R.map(component, props) would work here too,
    // but this might refactor better if we support passing child components
    R.liftN(1, component)(props)
  );
};

/**
 * Like liftAndExtract but expects propsWithItems to have an items key holding the functor
 * This is useful to separate dispatch actions from the props functor, since dispatch
 * actions are always the same for all items
 * @param {Function} component A React component function that expects props
 * @param {Object} propsWithItems Has a key items that holds an array or object
 * (or any other functor for which we can extract the values
 * @return {Object[]} A list of React components
 */
export const liftAndExtractItems = (component, propsWithItems) => {
  return liftAndExtract(component, reqPathThrowing(['items'], propsWithItems));
};

/**
 * Given a viewStyles function that expects props and returns styles keyed by view, merges those
 * view values into the views of the props.
 * @param {Function|Object} viewStyles Result an object mapping of view names to styles, or a function that expects
 * props and returns that object. viewStyles often merge props or apply them to functions.
 * @param props
 * @return {*}
 */
export const mergeStylesIntoViews = v(R.curry((viewStyles, props) => {
    // viewStyles can be an object or unary function that returns an object
    const viewObjs = applyToIfFunction(props, viewStyles);

    // if the viewObj has style as a key, we take that to mean that the object is in the
    // shape {style: {...}, className: 'extra class names'}. Otherwise it means
    // that it is just style props because no extra className was needed
    const viewToStyle = R.map(
      viewObj => R.ifElse(
        R.has('style'),
        // Done
        R.identity,
        // Wrap it in a style key
        style => ({style})
      )(viewObj),
      viewObjs);

    // Deep props.views with viewStyles and return entire props
    return R.over(
      R.lensProp('views'),
      views => mergeDeep(views, viewToStyle),
      props
    );
  }),
  [
    ['viewStyles', PropTypes.oneOfType([PropTypes.shape({}), PropTypes.func]).isRequired],
    ['props', PropTypes.shape().isRequired]
  ], 'mergeStylesIntoViews');

/**
 * Given viewProps keyed by by view names, find the one that matches name.
 * Then create the class and style props from the name and style props and merge it with the other props
 * If no matches props are found, {className: decamelized name} is returned
 * The resolved props obj can also be a function accepting an item for iteration views
 * Example: name = 'fooOuterDiv'
 * viewProps: {
 *  fooView: {
 *    bar: 1,
 *    style: {
 *      color: 'red'
 *    }
 *  },
 *  OtherView: item => {
 *    bar: 1,
 *    key: item.key
 *    style: {
 *      color: 'red'
 *    }
 *  },
 * }
 * resolves to {
 *  bar: 1,
 *  className: 'foo-outer-div'
 *  style: {
 *    color: 'red'
 *  }
 * }
 *
 * @param views
 * @param name
 * @return {*}
 */
export const propsFor = v((views, name) => {
    const propsForView = R.defaultTo({}, R.view(R.lensProp(name), views));
    const classAndStyle = getClassAndStyle(
      name,
      views
    );

    // If the resulting propsForView is a function, wrap the merge as a function expecting an item
    return R.ifElse(
      R.is(Function),
      f => item => R.merge(f(item), classAndStyle),
      obj => R.merge(obj, classAndStyle)
    )(propsForView);
  },
  [
    ['views', PropTypes.shape().isRequired],
    ['name', PropTypes.string.isRequired]
  ], 'propsFor');

/**
 * Like propsFor but doesn't generate a className since non-trivial components ignore it
 * @param views
 * @param name
 * @return {*}
 */
export const propsForSansClass = v((views, name) => {
    const propsForView = R.defaultTo({}, R.view(R.lensProp(name), views));
    return R.merge(
      propsForView,
      getStyleObj(name, views)
    );
  },
  [
    ['views', PropTypes.shape().isRequired],
    ['name', PropTypes.string.isRequired]
  ], 'propsForSansClass');

export const propsAndStyle = (name, viewProps) => R.merge(
  getStyleObj(name, R.propOr({name: {style: {}}}, name, viewProps)),
  R.omit(['style'], viewProps)
);

/**
 * Applies an item to props that have unary functional values.
 * Also applies an item to props.styles keys if they are functions.
 * TODO consider making this recursive rather than targeting style
 * @param {Object|Function} propsOrFunc The props to which to apply the item. This can also be a function
 * expecting the item
 * @param item The item to which to call on properties that are function
 */
export const itemizeProps = R.curry((propsOrFunc, item) => {
  const mapApplyToItem = R.mapObjIndexed((value, key) =>
    R.when(
      // TODO hack don't allow on... methods. These are actions. Actions should really be in actions: {}
      R.both(R.is(Function), () => R.complement(R.startsWith('on'))(key)),
      // Apply the prop function to item (i.e. call the function with item)
      f => R.applyTo(item, f)
    )(value)
  );

  return R.compose(
    // Repeat for style props
    R.when(
      R.has('style'),
      R.over(
        R.lensProp('style'),
        style => mapApplyToItem(style)
      )
    ),
    // For any prop that has a function, call it with item
    mapApplyToItem
    // If the propsOrFunc is a func, apply it to item, either way we end up with the props
  )(applyToIfFunction(item, propsOrFunc));
});

/**
 * Calls propsFor wrapped in itemizeProps. This first resolves the props of the view given by name,
 * then it applies item to any function in the resolved props and in props.style.
 * @param {Object} views The views keyed by named and valued by a props object (or function that resolves to props)
 * @param {String} name The view name to resolve
 * @param {Object} item The item to call on any functions in the resolved props and props.styles
 * @returns {Object} Fully resolved props for the particular item
 */
export const propsForItem = R.curry((views, name, item) => itemizeProps(propsFor(views, name), item));

/**
 * Creates {name1: name1, name2: name2} from a list of names
 * @param {Object} nameObj A list of names to be constants
 */
export const nameLookup = nameObj =>
  R.mapObjIndexed(
    (v, k) => k,
    nameObj
  );

/**
 * Convenience method to call mergeActionsForView, mergePropsForView, and mergeStylesIntoViews
 * @param {Object} viewActions Argument to mergeActionsForView. See mergeActionsForViews
 * @param {Object|Function} viewProps Argument to mergePropsForViews. See mergePropsForViews
 * @param {Object|Function} viewStyles Argument to mergeStylesIntoViews. See mergeStylesIntoViews
 * @param {Object} props Props that are used for the composition. Each of the three functions
 * is called with the props.
 * Styles is computed first in case viewProps need to access a computed style value, namely with and height.
 * Otherwise There should be no dependencies between the three functions--they
 * each contribute to the returned props.views
 * @return {Function} The modified props with view properties added by each of the three functions
 */
export const composeViews = R.curry((viewActions, viewProps, viewStyles, props) => R.compose(
  mergeActionsForViews(viewActions),
  mergePropsForViews(viewProps),
  mergeStylesIntoViews(viewStyles)
  )(props)
);

/**
 * Like composeViews but takes a viewStruct as input for smaller component
 * @param {Object} viewStruct
 * @param {Object} viewStruct.actions Optional. Maps actions to views
 * @param {Object} viewStruct.props Optional. Maps props to views
 * @param {Object} viewStruct.styles Optional. Maps styles and className to views
 * @return {Function} The modified props with view properties added by each of the three functions
 */
export const composeViewsFromStruct = R.curry((viewStruct, props) => {
    const propFor = R.prop(R.__, viewStruct);
    return R.compose(
      R.when(R.always(propFor('actions')), mergeActionsForViews(propFor('actions'))),
      R.when(R.always(propFor('props')), mergePropsForViews(propFor('props'))),
      R.when(R.always(propFor('styles')), mergeStylesIntoViews(propFor('styles')))
    )(props);
  }
);

/**
 * Joins React components with a separatorComponent between each
 * @param {Function} separatorComponent Unary function that expects a key to index the component in the list
 * (using the React key property)
 * @param {Function[]} components List of unary functions returning a component. The function also expects key
 * to index the component in the list
 * @returns {Array} The components interspersed with separatorComponents
 */
export const joinComponents = v((separatorComponent, components) =>
  R.addIndex(R.reduce)(
    (prevComponents, component, key) => R.ifElse(
      R.isNil,
      // Just component
      () => [component(key * 2)],
      // Add separator and component to previous
      R.flip(R.concat)([
        separatorComponent(key * 2 - 1),
        component(key * 2)
      ])
    )(prevComponents),
    null,
    components
  ), [
  ['separatorComponent', PropTypes.func.isRequired],
  ['components', PropTypes.arrayOf(PropTypes.func).isRequired]
], 'renderLoadingDefault');
;

/**
 * A default loading React component, which is passed the props in props.views.viewName
 * @param viewName The viewname with which to resolve the props
 * @return A function expecting props, which renders the loading component
 */
export const renderLoadingDefault = v(viewName => ({views}) => {
  const [Div] = eMap(['div']);
  const props = propsFor(views);
  return Div(props(viewName));
}, [
  ['viewName', PropTypes.string.isRequired]
], 'renderLoadingDefault');

/**
 * A default error React component, which is passed the props in props.views.viewName
 * @param viewName The viewname with which to resolve the props
 * @return A function expecting props, which renders the error component
 */
export const renderErrorDefault = v(viewName => ({data, views}) => {
  const [Div] = eMap(['div']);
  const props = propsFor(views);
  const errors = data.error.graphQLErrors;
  return Div(props(viewName),
    R.join('\n\n',
      R.map(
        error => `Original Error: ${error.originalError.message}\nOriginal Trace ${error.originalError.stack}\nError: ${data.error.message}\nTrace: ${data.error.stack}`,
        errors
      )
    )
  );
}, [
  ['viewName', PropTypes.string.isRequired]
], 'renderLoadingDefault');

