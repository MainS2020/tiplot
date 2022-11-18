import Select from "react-select";
import Plot from "react-plotly.js";
import Plotly from "plotly.js/dist/plotly";
import { useState, useEffect } from "react";
import GraphOptions from "./GraphOptions";

function Graph({ graphIndex, socket, updateKeys, initialKeys, removeGraph }) {
  const [keys, setKeys] = useState([]);
  const [data, setData] = useState([]);
  const [selectedValue, setSelected] = useState();
  var plot;

  useEffect(() => {
    plotInitialData();
    socket.emit("get_table_keys", graphIndex);

    // map and set the keys when recieved from backend
    socket.on("table_keys", (response) => {
      const index = response["index"];
      const keys = response["keys"];

      // return if its not the components that made the request
      if (index !== graphIndex) return;
      var options = [];
      keys.forEach((value, index) => {
        var key = Object.keys(value)[0];
        var nested_keys = Object.values(value)[0];
        nested_keys.forEach((nested, idx) => {
          options.push({
            label: `${key}/${nested}`,
            value: `${key}/${nested}`,
            key: key,
            nested: nested,
          });
        });
      });
      setKeys(options);
    });
    // vertical resize listener
    plot = document.getElementById(`plot-${graphIndex}`);
    new ResizeObserver(stretchHeight).observe(plot);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    autoRange();
  }, [data]);

  const stretchHeight = () => {
    var update = {
      autoresize: true,
      width: plot.clientWidth,
      height: plot.clientHeight,
      "yaxis.autorange": true,
    };

    if (plot.clientHeight != 0) Plotly.relayout(plot, update);
  };

  const addData = async (table, key) => {
    socket.off("table_values");
    socket.emit("get_table_values", {
      index: graphIndex,
      table: table,
      keys: [key],
    });

    socket.on("table_values", (response) => {
      const index = response["index"];
      const table = response["table"];
      const key = response["y"];
      const values = response["values"];

      // return if its not the components that made the request
      if (index !== graphIndex) return;

      var x = [],
        y = [];
      values.forEach((e) => {
        // x.push(e["timestamp"]);
        x.push(e["timestamp_tiplot"]);
        y.push(e[key]);
      });
      var line = {
        x: x,
        y: y,
        name: `${table}/${key}`,
      };
      setData([...data, line]);
    });
  };

  const removeData = async (key, nested) => {
    const name = `${key}/${nested}`;
    setData(data.filter((graph) => graph.name !== name));
  };

  const handleChange = (keysList, actionMeta) => {
    updateKeys(graphIndex, keysList);
    setSelected(keysList);
    switch (actionMeta.action) {
      case "select-option":
        addData(actionMeta.option.key, actionMeta.option.nested);
        break;
      case "remove-value":
        removeData(actionMeta.removedValue.key, actionMeta.removedValue.nested);
        break;
      case "pop-value":
        removeData(actionMeta.removedValue.key, actionMeta.removedValue.nested);
        break;
      case "clear":
        setData([]);
        break;
      default:
        break;
    }
  };

  // relayout handler
  const relayoutHandler = (event) => {
    // sync the other plots
    if (
      event["xaxis.range[0]"] != null &&
      // event["yaxis.range[0]"] == null &&
      event["custom"] == null
    ) {
      // event generated by drag action
      syncHorizontalAxis(event);
    }

    if (
      event["xaxis.range[0]"] != null &&
      event["yaxis.range[0]"] == null &&
      event["custom"]
    ) {
      // event generated by syncHorizontalAxis
      var xrange = [event["xaxis.range[0]"], event["xaxis.range[1]"]];
      var yrange = autoScaleVerticalAxis(xrange);

      const update = {
        custom: true,
        "xaxis.range": xrange,
        "yaxis.range": yrange,
      };

      Plotly.relayout(plot, update);
    }

    // resetting all layouts when double tap
    if (
      event["xaxis.autorange"] !== undefined &&
      event["yaxis.autorange"] !== undefined &&
      event["custom"] == null
    ) {
      // event generated by double click
      autoRange();
    }
  };

  // find the closest point to 'x' in 'array'
  const findClosest = (x, array) => {
    return array.x.reduce((a, b) => {
      return Math.abs(b - x) < Math.abs(a - x) ? b : a;
    });
  };

  //  adujst y range on the visible data
  const autoScaleVerticalAxis = (xrange) => {
    plot = document.getElementById(`plot-${graphIndex}`);
    var max_values = [];
    var min_values = [];
    if (plot.data.length == 0) return;
    for (let j = 0; j < plot.data.length; j++) {
      var e = plot.data[j];
      var x0 = findClosest(xrange[0], e);
      var x1 = findClosest(xrange[1], e);
      const visible_y_data = e.y.slice(e.x.indexOf(x0), e.x.indexOf(x1));
      max_values.push(Math.max.apply(Math, visible_y_data));
      min_values.push(Math.min.apply(Math, visible_y_data));
      const max =
        Math.max.apply(Math, max_values) != Infinity
          ? Math.max.apply(Math, max_values)
          : 1;
      const min =
        Math.min.apply(Math, min_values) != -Infinity
          ? Math.min.apply(Math, min_values)
          : 0;

      var margin = (max - min) / 4;
      margin = margin == 0 ? 0.5 : margin; // set the margin to 1 in case of max == min
      var new_y_range = [min - margin, max + margin];
    }
    return new_y_range;
  };

  // set the same x_range for all graphs
  const syncHorizontalAxis = (event) => {
    const plots = document.getElementsByClassName("plot-yt");
    const update = {
      custom: true,
      "xaxis.range[0]": event["xaxis.range[0]"],
      "xaxis.range[1]": event["xaxis.range[1]"],
    };

    for (let i = 0; i < plots.length; i++) {
      Plotly.relayout(plots[i], update);
    }
  };

  const autoRange = () => {
    const plots = document.getElementsByClassName("plot-yt");

    for (let i = 0; i < plots.length; i++) {
      if (plots[i].data.length == 0) return;

      const x_min = Math.min.apply(Math, plots[i].data[0].x);
      const x_max = Math.max.apply(Math, plots[i].data[0].x);

      const update = {
        custom: true,
        "xaxis.range": [x_min, x_max],
        "yaxis.autorange": true,
      };

      Plotly.relayout(plots[i], update);
    }
  };

  const handleRestyle = (event) => {};

  const handleHover = (event) => {
    let i = 0;
    const index = event.points[0].pointIndex;
    const nbrPoints = event.points[0].data.x.length;
    const x = event.points[0].x;

    if (window.time_array !== undefined) {
      const start = window.time_array[0];
      const stop = window.time_array[window.time_array.length - 1];
      const totalSecs = window.Cesium.JulianDate.secondsDifference(stop, start);
      if (event.event.altKey) {
        updateTimelineIndicator(x);
      }
    }

    // TODO: FIX

    // const plots = document.getElementsByClassName("plot-yt");
    // for (let i = 0; i < plots.length; i++) {
    //   if (plots[i].id == graphIndex) continue;
    //   if (plots[i].data.length == 0) continue;
    //   console.log(plots[i].id);
    //   Plotly.Fx.hover(plots[i], event.event);
    // }

    // TODO: REMOVE

    // while (document.getElementById(`plot-${i}`)) {
    //   var plot = document.getElementById(`plot-${i}`);
    //   i++;
    //   if (graphIndex === i - 1) continue; // dont mimic hover on the same graph we're hovering over
    //   if (plot.data.length === 0) continue; // dont mimic hover on a graph that has no data
    //   // mimic hover for t/y graphs
    //   if (plot.classList.contains("plot-yt")) {
    //     Plotly.Fx.hover(plot, event.event);
    //   }

    //   // mimic hover for x/y graphs
    //   if (plot.classList.contains("plot-xy")) {
    //     const factor = plot.data[0].x.length / nbrPoints;
    //     const mapped_index = parseInt(factor * index);

    //     Plotly.Fx.hover(plot, {
    //       xval: plot.data[0].x[mapped_index],
    //       yval: plot.data[0].y[mapped_index],
    //     });
    //   }
    // }
  };

  const handleClick = (event) => {
    let i = 0;
    const index = event.points[0].pointIndex;
    const nbrPoints = event.points[0].data.x.length;
    const x = event.points[0].x;
    if (window.time_array !== undefined) {
      const start = window.time_array[0];
      const stop = window.time_array[window.time_array.length - 1];
      const totalSecs = window.Cesium.JulianDate.secondsDifference(stop, start);
      if (event.event.ctrlKey) {
        updateTimelineIndicator(x);
      }
    }
  };

  const plotInitialData = () => {
    if (initialKeys === undefined) return; // return if we have no initial keys

    setSelected(initialKeys);
    var initialData = [];
    initialKeys.forEach((option, index) => {
      socket.emit("get_table_values", {
        index: graphIndex,
        table: option.key,
        keys: [option.nested],
      });
    });

    socket.on("table_values", (response) => {
      // console.log(initialData);
      const index = response["index"];
      const table = response["table"];
      const key = response["y"];
      const values = response["values"];

      // return if its not the components that made the request
      if (index !== graphIndex) return;

      var x = [],
        y = [];
      values.forEach((e) => {
        // x.push(e["timestamp"]);
        x.push(e["timestamp_tiplot"]);
        y.push(e[key]);
      });
      var line = {
        x: x,
        y: y,
        name: `${table}/${key}`,
      };
      initialData.push(line);
      setData(initialData);
    });
  };

  const updateTimelineIndicator = (t) => {
    plot = document.getElementById(`plot-${graphIndex}`);
    if (plot.data.length == 0) return;
    const t0 = plot.data[0].x[0];
    const timestamp = t - t0;
    window.viewer.clock.currentTime.secondsOfDay =
      window.viewer.clock.startTime.secondsOfDay + timestamp;
    const update = {
      shapes: [
        {
          type: "line",
          x0: t,
          y0: 0,
          x1: t,
          yref: "paper",
          y1: 1,
          line: {
            color: "red",
            width: 1.5,
            // dash: "dot",
          },
        },
      ],
    };
    const plots = document.getElementsByClassName("plot-yt");
    for (let i = 0; i < plots.length; i++) {
      Plotly.relayout(plots[i], update);
    }
  };

  const defaultLayout = {
    autoresize: true,
    showlegend: true,
    legend: {
      x: 1,
      xanchor: "right",
      y: 1,
    },
    margin: {
      t: 10,
      b: 25,
      l: 25,
      r: 25,
    },
    hovermode: "x unified",
    // height: plot.clientHeight,
  };

  return (
    <div>
      <Select
        id={`select-${graphIndex}`}
        options={keys}
        isMulti
        onChange={handleChange}
        value={selectedValue}
        closeMenuOnSelect={false}
      />
      <div className="d-flex resizable">
        <Plot
          className="plot-yt"
          divId={`plot-${graphIndex}`}
          data={data}
          layout={defaultLayout}
          onRelayout={relayoutHandler}
          onHover={handleHover}
          onClick={handleClick}
          onRestyle={handleRestyle}
          // useResizeHandler
          config={{
            displayModeBar: false,
          }}
        />

        <GraphOptions
          plotId={`plot-${graphIndex}`}
          graphIndex={graphIndex}
          removeGraph={removeGraph}
        />
      </div>
    </div>
  );
}
export default Graph;
