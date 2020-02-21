/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import 'jest';
import { observable, observable, ObservableSet, observe, unobserve } from '@pixano/core';


@observable
class Point {
  public x = 0.0;
  public y = 0.0;
}


test('props', () => {
  const p = new Point();
  let n = 0;
  observe(p, (prop: string, value: any) => {
    expect(prop).toBe('x');
    expect(value).toBe(2.);
    n++;
  });
  p.x = 2.;
  expect(n).toBe(1);

  const stuff = observable({ a: 0 });
  observe(stuff, (prop: string, value: any) => {
    expect(prop).toBe('a');
    expect(value).toBe(3.);
    n++;
  });
  stuff.a = 3.;
  expect(n).toBe(2);
});


test('set', () => {
  const s = new ObservableSet();
  observe(s, function f(op: string, value: any) {
    expect(op).toBe("add");
    expect(value).toBe(1.);
    unobserve(s, f);
  });
  s.add(1.);

  expect(s.size).toBe(1);

  observe(s, function g(op: string, value: any) {
    expect(op).toBe("delete");
    expect(value).toBe(1.);
    unobserve(s, g);
  });

  s.delete(1.);
});

test('order', () => {
  const s = new ObservableSet();
  const f2 = observe(s, (op: string, value: number[]) => {
    expect(op).toBe("add");
    expect(value[0]).toBe(1);
  }, 20);
  const f1 = observe(s, (op: string, value: number[]) => {
    expect(op).toBe("add");
    expect(value[0]).toBe(0);
    value[0] = 1;
  }, 10);

  const v = [0];
  s.add(v);

  expect(v[0]).toBe(1);

  unobserve(s, f1);
  unobserve(s, f2);

  observe(s, function g(op: string, value: number[]) {
    expect(op).toBe("delete");
    expect(value[0]).toBe(1);
  });

  s.delete(v);
});
