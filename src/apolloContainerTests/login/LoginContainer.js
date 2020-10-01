/**
 * Created by Andy Likuski on 2020.09.30
 * Copyright (c) 2020 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import {adopt} from 'react-adopt';
import * as R from 'ramda';
import {
  authenticatedUserLocalContainer,
  deleteRefreshTokenCookieMutationRequestContainer,
  deleteTokenCookieMutationRequestContainer,
  tokenAuthMutationContainer
} from 'rescape-apollo';

/**
 * Each query and mutation expects a container to compose then props
 * @param {Object} apolloConfig Optionally supply {apolloClient} to run requests as tasks instead of components
 * @return {{queryRegions: (function(*=): *), mutateRegion: (function(*=): *), queryUserRegions: (function(*=): *)}}
 */
export const apolloContainersLogin = (apolloConfig = {}) => {
  return {
    mutateTokenAuth: props => {
      return tokenAuthMutationContainer(
        R.merge(apolloConfig,
          {
            options: {
              variables: props => {
                return R.pick(['username', 'password'], props);
              },
              // Pass through error so we can handle it in the component
              errorPolicy: 'all'
            }
          }
        ),
        {},
        props
      );
    }
  };
};

// This produces a component class that expects a props object keyed by the keys in apolloContainersLogout
// The value at each key is the result of the corresponding query container or the mutate function of the corresponding
// mutation container
export default adopt(apolloContainersLogin());
