import * as React from 'react';
import renderer from 'react-test-renderer';

import { MonoText } from '../StyledText';

it(`renders correctly`, () => {
  let testRenderer;
  renderer.act(() => {
    testRenderer = renderer.create(<MonoText>Snapshot test!</MonoText>);
  });

  expect(testRenderer.toJSON()).toMatchSnapshot();
});
