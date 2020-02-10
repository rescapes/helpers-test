import {chainObjToValues} from 'rescape-ramda';
import {makeRegionsQueryContainer, regionOutputParams, makeRegionMutationContainer} from 'rescape-place';
import {composeApolloContainers} from 'rescape-helpers-component';
import Sample from './SampleComponent';
import {e} from 'rescape-helpers-component';
import {adopt} from 'react-adopt';

// Each query and mutation expects a container to compose then props
export const apolloContainers = {
  // Creates a function expecting a component to wrap and props
  queryRegions: makeRegionsQueryContainer(
    {
      options: {
        variables: (props) => ({
          id: props.region.id
        }),
        // Pass through error so we can handle it in the component
        errorPolicy: 'all'
      }
    },
    {
      outputParams: regionOutputParams,
      propsStructure: {
        id: 0
      }
    }
  ),
  mutateRegion: makeRegionMutationContainer(
    {
      options: {
        errorPolicy: 'all'
      }
    },
    {
      outputParams: regionOutputParams
    }
  )
};

// This produces a function expecting props
const apolloContainer = adopt(apolloContainers);
export default e(apolloContainer, {}, Sample);

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

