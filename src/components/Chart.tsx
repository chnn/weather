import { Fragment, useId } from "react";
import type { SVGAttributes } from "react";
import {
  curveMonotoneX,
  extent,
  line,
  scaleLinear,
  range,
  scaleTime,
  scaleSequential,
  interpolateTurbo,
} from "d3";
import type { ScaleLinear, ScaleSequential, ScaleTime } from "d3";
import { Temporal } from "@js-temporal/polyfill";

import type { TimeSeries, Dimensions, Point } from "../types";

import styles from "./Chart.module.css";

type DayBoundaries = Array<[number, number]>;

const COLOR_SCALE_BY_TS_LABEL: { [tsLabel: string]: ScaleSequential<string> } =
  {
    Temperature: scaleSequential(interpolateTurbo).domain([0, 35]),
    "Dew Point": scaleSequential(interpolateTurbo).domain([0, 21]),
  };

const cToF = (c: number): number => (c * 9) / 5 + 32;

const getDayBoundaries = (
  startTime: number,
  endTime: number
): DayBoundaries => {
  const startDateTime =
    Temporal.Instant.fromEpochMilliseconds(startTime).toZonedDateTimeISO(
      "America/New_York"
    );

  const endDateTime =
    Temporal.Instant.fromEpochMilliseconds(endTime).toZonedDateTimeISO(
      "America/New_York"
    );

  const boundaries: DayBoundaries = [];
  let currentBoundary = startDateTime.startOfDay();

  while (
    endDateTime.epochMilliseconds - currentBoundary.epochMilliseconds >
    0
  ) {
    const boundaryStart = currentBoundary.epochMilliseconds;
    currentBoundary = currentBoundary.add("P1D");
    const boundaryEnd = currentBoundary.epochMilliseconds;
    boundaries.push([boundaryStart, boundaryEnd]);
  }

  return boundaries;
};

const getExtremePoints = (points: Point[]): Point[] => {
  return points
    .filter(
      // Find inflection points
      (p, i) =>
        (p.value < points[i - 1]?.value && p.value < points[i + 1]?.value) ||
        (p.value > points[i - 1]?.value && p.value > points[i + 1]?.value)
    )
    .filter((p, i, ps) => ps[i - 1]?.i !== p.i - 1); // Filter out points that are too close
};

const getPointLabelPositioning = (
  { i, value: p }: Point,
  ps: Point[]
): {
  dx: number;
  dy: number;
  textAnchor?: SVGAttributes<SVGTextElement>["textAnchor"];
  alignmentBaseline?: SVGAttributes<SVGTextElement>["alignmentBaseline"];
} => {
  const D = 10;

  if (i === 0 || i === ps.length - 1) {
    return {
      dx: 0,
      dy: 0,
    };
  }

  const p0 = ps[i - 1].value;
  const p1 = ps[i + 1].value;

  if (p0 < p && p1 < p) {
    return {
      textAnchor: "middle",
      dx: 0,
      dy: -D,
    };
  }

  if (p0 > p && p1 > p) {
    return {
      textAnchor: "middle",
      alignmentBaseline: "hanging",
      dx: 0,
      dy: D,
    } as const;
  }

  if (p0 < p && p1 > p) {
    return {
      textAnchor: "end",
      alignmentBaseline: "middle",
      dx: -D,
      dy: -D,
    } as const;
  }

  if (p0 > p && p1 < p) {
    return {
      textAnchor: "start",
      alignmentBaseline: "middle",
      dx: D,
      dy: -D,
    } as const;
  }

  return {
    dx: 0,
    dy: 0,
  };
};

const DayLabel = ({ time, x, y }: { time: number; x: number; y: number }) => {
  const DAY_OF_WEEK_LABELS: { [n: number]: string } = {
    1: "M",
    2: "Tu",
    3: "W",
    4: "Th",
    5: "F",
    6: "Sa",
    7: "Su",
  };

  const dateTime =
    Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(
      "America/New_York"
    );

  return (
    <text key={time} className={styles.xTickLabel} x={x} y={y}>
      {DAY_OF_WEEK_LABELS[dateTime.dayOfWeek]} {dateTime.month}/{dateTime.day}
    </text>
  );
};

const AxesAndTicks = ({
  spacing,
  width,
  height,
  xTicks,
  yTicks,
}: {
  spacing: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  xTicks: number[];
  yTicks: number[];
}) => {
  return (
    <>
      <line
        className={styles.chartAxis}
        x1={0}
        x2={width}
        y1={height}
        y2={height}
      />
      <line className={styles.chartAxis} x1={0} x2={width} y1={0} y2={0} />
      <line className={styles.chartAxis} x1={0} x2={0} y1={0} y2={height} />
      <line
        className={styles.chartAxis}
        x1={width}
        x2={width}
        y1={0}
        y2={height}
      />
      {xTicks.map((tick) => (
        <line
          key={tick.valueOf()}
          className={styles.chartTick}
          x1={tick}
          x2={tick}
          y1={0}
          y2={height}
        />
      ))}
      {yTicks.map((tick) => (
        <line
          key={tick}
          className={styles.chartTick}
          x1={0}
          x2={width}
          y1={tick}
          y2={tick}
        />
      ))}
    </>
  );
};

const TsPath = ({
  points,
  xScale,
  yScale,
  colorScale,
}: {
  points: Point[];
  xScale: ScaleTime<number, number>;
  yScale: ScaleLinear<number, number>;
  colorScale: ScaleSequential<string>;
}) => {
  const gradientId = useId();

  const pathGenerator = line<Point>()
    .curve(curveMonotoneX)
    .x((d) => xScale(d.time))
    .y((d) => yScale(d.value));

  const [d0, d1] = extent(points, (d) => d.value) as [number, number];

  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="1" y2="0">
          {range(d0, d1, (d1 - d0) / 10).map((y, i, ys) => (
            <stop
              key={y}
              stopColor={colorScale(y)}
              offset={`${(i / ys.length) * 100}%`}
            />
          ))}
        </linearGradient>
      </defs>
      <path
        d={pathGenerator(points)!}
        strokeWidth="2"
        stroke={`url(#${gradientId})`}
        fill="none"
      ></path>
    </>
  );
};

const PointLabel = ({
  point,
  points,
  x,
  y,
  color,
  width,
  height,
}: {
  point: Point;
  points: Point[];
  x: number;
  y: number;
  color: string;
  width: number;
  height: number;
}) => {
  // If a label inside the chart is this close to one of the borders, we hide it
  const MIN_SPACE_FOR_INNER_LABELS = 30; // px

  const { alignmentBaseline, textAnchor, dx, dy } = getPointLabelPositioning(
    point,
    points
  );

  if (
    x < MIN_SPACE_FOR_INNER_LABELS ||
    y < MIN_SPACE_FOR_INNER_LABELS ||
    Math.abs(width - x) < MIN_SPACE_FOR_INNER_LABELS ||
    Math.abs(height - y) < MIN_SPACE_FOR_INNER_LABELS
  ) {
    return null;
  }

  return (
    <>
      <circle
        cx={x}
        cy={y}
        r="3"
        fill="white"
        stroke={color}
        strokeWidth="2"
      ></circle>
      <text
        className={styles.pointLabel}
        x={x + dx}
        y={y + dy}
        fill={color}
        alignmentBaseline={alignmentBaseline}
        textAnchor={textAnchor}
      >
        {Math.round(cToF(point.value))}º
      </text>
    </>
  );
};

export const Chart = ({
  tss,
  height,
  width,
}: { tss: TimeSeries[] } & Dimensions) => {
  width = width < 1000 ? 1200 : width;

  const outerSpacing = { top: 0, right: 0, bottom: 18, left: 0 };
  const innerSpacing = { top: 30, right: 0, bottom: 30, left: 0 };

  const innerWidth = width - outerSpacing.left - outerSpacing.right;
  const innerHeight = height - outerSpacing.top - outerSpacing.bottom;

  const allTimes = tss.map((ts) => ts.points).flat();
  const allValues = tss.map((ts) => ts.points).flat();
  const xDomain = extent(allTimes, (d) => d.time) as [number, number];
  const yDomain = extent(allValues, (d) => d.value) as [number, number];

  const xScale = scaleTime()
    .domain(xDomain)
    .range([innerSpacing.left, innerWidth - innerSpacing.right]);

  const yScale = scaleLinear()
    .domain(yDomain)
    .range([innerHeight - innerSpacing.bottom, innerSpacing.top]);

  const dayBoundaries = getDayBoundaries(xDomain[0], xDomain[1]);

  const extremePointsByTs: { [tsLabel: string]: Point[] } = tss.reduce(
    (acc, ts) => ({ ...acc, [ts.label]: getExtremePoints(ts.points) }),
    {}
  );

  return (
    <>
      <svg className={styles.chart} width={width} height={height}>
        {dayBoundaries.map(([t0, t1]) => (
          <DayLabel
            key={t0}
            time={t0}
            x={outerSpacing.left + xScale(t0 + (t1 - t0) / 2)}
            y={height - 2}
          />
        ))}
        <g transform={`translate(${outerSpacing.left},${outerSpacing.top})`}>
          <AxesAndTicks
            spacing={outerSpacing}
            width={innerWidth}
            height={innerHeight}
            xTicks={dayBoundaries.map(([d0]) => d0).map((x) => xScale(x))}
            yTicks={yScale.ticks(5).map((y) => yScale(y))}
          />
          {tss.map((ts) => (
            <Fragment key={ts.label}>
              <TsPath
                points={ts.points}
                xScale={xScale}
                yScale={yScale}
                colorScale={COLOR_SCALE_BY_TS_LABEL[ts.label]}
              />
              <>
                {extremePointsByTs[ts.label].map((p) => (
                  <PointLabel
                    key={p.i}
                    point={p}
                    points={ts.points}
                    x={xScale(p.time)}
                    y={yScale(p.value)}
                    width={width}
                    height={height}
                    color={COLOR_SCALE_BY_TS_LABEL[ts.label](p.value)}
                  />
                ))}
              </>
            </Fragment>
          ))}
        </g>
      </svg>
    </>
  );
};
