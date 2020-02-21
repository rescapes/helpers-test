import {makeRegionMutationContainer, makeRegionsQueryContainer, regionOutputParams} from 'rescape-place';
import Sample from './SampleComponent';
import {adopt} from 'react-adopt';
import {apolloHOC} from '../apolloContainerTestHelpers';
import {makeMutationRequestContainer, makeQueryContainer} from 'rescape-apollo';
import * as R from 'ramda';

export const readInputTypeMapper = {
  //'data': 'DataTypeofLocationTypeRelatedReadInputType'
  'geojson': 'FeatureCollectionDataTypeofRegionTypeRelatedReadInputType'
};
const _makeRegionsQueryContainer = R.curry((apolloConfig, {outputParams}, props) => {
  return makeQueryContainer(
    apolloConfig,
    {name: 'regions', readInputTypeMapper, outputParams},
    props
  );
});
export const _makeRegionMutationContainer = R.curry((apolloConfig, {outputParams}, props) => {
  return makeMutationRequestContainer(
    apolloConfig,
    {
      name: 'region',
      outputParams
    },
    props
  );
});

// Each query and mutation expects a container to compose then props
export const apolloContainers = {
  // Creates a function expecting a component to wrap and props
  queryRegions: _makeRegionsQueryContainer(
    {
      options: {
        variables: (props) => {
          return {
            id: parseInt(props.region.id)
          };
        },
        // Pass through error so we can handle it in the component
        errorPolicy: 'all'
      }
    },
    {
      outputParams: regionOutputParams
    }
  ),
  mutateRegion: _makeRegionMutationContainer(
    {
      options: {
        variables: (props) => {
          return R.prop('region', props);
        },
        errorPolicy: 'all'
      }
    },
    {
      outputParams: regionOutputParams
    }
  )
};

// This produces a function expecting props
const apolloContainerComposed = adopt(apolloContainers);
const apolloHoc = apolloHOC(apolloContainerComposed);
export default apolloHoc(Sample);
// No apolloHOC would be needed if Sample is just a render function:
//e(apolloContainerComposed, {}, Sample)

/*
// TODO I'd like to use async components instead of having makeRegionMutationContainer, etc return Maybes. They
// should return tasks that we convert to promises
// Create the GraphQL Container.
const ContainerWithData = child => asyncComponent({
  resolve: () => {
    return taskToPromise(composeGraphqlRequestsTaskMaker(child, {id: 0}));
  }
});

const asyncContainer = ContainerWithData(Sample);
*/

