/**
 * Created by Andy Likuski on 2020.11.23
 * Copyright (c) 2020 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
// 1. Import useStyleConfig
import {e} from '@rescapes/helpers-component';
import * as  chakra from '@chakra-ui/react';

import {defaultNode} from '@rescapes/ramda';

const {Box} = defaultNode(chakra);
import * as chakraReact from "@chakra-ui/react";

const {useStyleConfig} = defaultNode(chakraReact);

export default function ExampleButton(props) {
  const {size, variant, ...rest} = props;

  // 2. Reference `ExampleButtonConfig` stored in `theme.components`
  const styles = useStyleConfig("ExampleButton", {size, variant});

  // 3. Pass the computed styles into the `sx` prop
  return e(Box, {as: 'button', sx: styles, ...rest});
}
