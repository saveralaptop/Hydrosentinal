import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props = {
  data: WaterPoint[];
  type: "tds" | "ph" | "turbidity";
};

type WaterPoint = {
  time: number | string;
  tds?: number;
  ph?: number;
  turbidity?: number;
};

type DotRendererProps = {
  cx?: number;
  cy?: number;
  index?: number;
};

const isUnsafe = (data: WaterPoint) => {
  return (
    (data.tds ?? 0) > 1000 ||
    (data.turbidity ?? 0) > 25 ||
    (data.ph ?? 7) < 6.5 ||
    (data.ph ?? 7) > 8.5
  );
};

export const WaterGraph = ({ data, type }: Props) => {
  const visibleData = data
    .slice(-10)
    .map((point, index) => ({ ...point, time: index + 1 }));

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl hover:scale-[1.02] transition duration-300">
      {" "}
      <h2 className="text-sm font-semibold mb-3">📊 Water Trends</h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={visibleData}>
          <XAxis dataKey="time" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "10px",
            }}
          />
          {type === "tds" && (
            <Line
              type="monotone"
              dataKey="tds"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          )}

          {type === "ph" && (
            <>
              <Line
                type="monotone"
                dataKey="ph"
                stroke="#22c55e"
                strokeWidth={2}
                dot={(props: DotRendererProps) => {
                  const { cx = 0, cy = 0, index = 0 } = props;

                  if (index === visibleData.length - 1) {
                    return <circle cx={cx} cy={cy} r={6} fill="#22c55e" />;
                  }

                  return <circle cx={cx} cy={cy} r={3} fill="#22c55e" />;
                }}

                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="turbidity"
                stroke="#eab308"
                strokeWidth={2}
                dot={(props: DotRendererProps) => {
                  const { cx = 0, cy = 0, index = 0 } = props;

                  if (index === visibleData.length - 1) {
                    return <circle cx={cx} cy={cy} r={6} fill="#eab308" />;
                  }

                  return <circle cx={cx} cy={cy} r={3} fill="#eab308" />;
                }}

                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
