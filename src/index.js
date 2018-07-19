import {
  applyIfFunction,
  applyToIfFunction, composeViews, composeViewsFromStruct,
  eMap, itemizeProps, joinComponents, keyWith, keyWithDatum, liftAndExtract, liftAndExtractItems, loadingCompleteStatus,
  makeApolloTestPropsTaskFunction,
  makeTestPropsFunction,
  mergeActionsForViews,
  mergePropsForViews,
  mergeStylesIntoViews,
  nameLookup,
  propLensEqual, propsAndStyle, propsFor,
  propsForItem, propsForSansClass,
  renderChoicepoint, renderErrorDefault, renderLoadingDefault
} from './componentHelpers';

import {
  resolveSvgReact
} from './svgComponentHelpers';

import {
  waitForChildComponentRender, propsFromSampleStateAndContainer, makeMockStore,
  makeSampleInitialState, makeSampleStore, mockApolloClient, mockApolloClientWithSamples, shallowWrap, testState,
  wrapWithMockGraphqlAndStore, wrapWithMockStore, testPropsTaskMaker, parentPropsForContainerTask
} from './componentTestHelpers';

import {
  applyStyleFunctionOrDefault,
  createScaledPropertyGetter, getClass, getClassAndStyle, getStyleObj, styleArithmetic,
  styleMultiplier
} from './styleHelpers';

import { apolloContainerTests } from './apolloContainerTestHelpers'

export {
  loadingCompleteStatus,
  propLensEqual,
  eMap,
  renderChoicepoint,
  mergeActionsForViews,
  mergePropsForViews,
  keyWith,
  keyWithDatum,
  applyToIfFunction,
  applyIfFunction,
  makeTestPropsFunction,
  makeApolloTestPropsTaskFunction,
  liftAndExtract,
  liftAndExtractItems,
  mergeStylesIntoViews,
  propsFor,
  propsForSansClass,
  propsAndStyle,
  itemizeProps,
  propsForItem,
  nameLookup,
  composeViews,
  composeViewsFromStruct,
  joinComponents,
  renderLoadingDefault,
  renderErrorDefault,
  getClass,
  getClassAndStyle,
  getStyleObj,
  styleArithmetic,
  styleMultiplier,
  createScaledPropertyGetter,
  applyStyleFunctionOrDefault,
  resolveSvgReact,
  waitForChildComponentRender,
  propsFromSampleStateAndContainer,
  makeMockStore,
  makeSampleInitialState,
  makeSampleStore,
  mockApolloClient,
  mockApolloClientWithSamples,
  shallowWrap,
  testState,
  wrapWithMockGraphqlAndStore,
  wrapWithMockStore,
  testPropsTaskMaker,
  parentPropsForContainerTask,
  apolloContainerTests
};

