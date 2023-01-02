import Select from "react-select";
import Plot from "react-plotly.js";
import { useState, useEffect } from "react";
import GraphOptions from "./GraphOptions";
import PlotData from "../controllers/PlotData";

function Graph({ id, initialKeys, updateKeys, removeGraph }) {
  const plotData = new PlotData(id, initialKeys);
  const [options, setOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [data, setData] = useState([]);

  useEffect(() => {
    getInitialData();
    getOptions();
    const plot = document.getElementById(`plot-${id}`);
    new ResizeObserver(stretchHeight).observe(plot);
    // plotData.autoRange();
  }, []);

  useEffect(() => {
    plotData.autoRange();
  }, [data]);

  const getInitialData = async () => {
    if (initialKeys == null) return;
    setSelectedOptions(initialKeys);
    const initialData = [];
    for (let i = 0; i < initialKeys.length; i++) {
      const option = initialKeys[i].value;
      const d = await plotData.getData(option);
      initialData.push(d);
    }
    setData(initialData);
    squeezeSelect();
  };

  const stretchHeight = () => {
    plotData.stretchHeight();
  };

  const getOptions = async () => {
    const opt = await plotData.getOptions();
    setOptions(opt);
  };

  const addData = async (field) => {
    const d = await plotData.getData(field);
    setData([...data, d]);
  };

  const removeData = (field) => {
    const d = data.filter((e) => e.name != `${field.table}/${field.column}`);
    setData(d);
  };

  const handleSelectChange = (keysList, actionMeta) => {
    setSelectedOptions(keysList);
    updateKeys(id, keysList);
    switch (actionMeta.action) {
      case "select-option":
        addData(actionMeta.option.value);
        break;
      case "remove-value":
      case "pop-value":
        if (actionMeta.removedValue) removeData(actionMeta.removedValue.value);
        break;
      case "clear":
        setData([]);
        break;
      default:
        break;
    }
  };

  const handleHover = (event) => {
    const x = event.points[0].x;
    if (event.event.altKey) {
      plotData.updateTimelineIndicator(x);
    }
  };

  const relayoutHandler = (event) => {
    // Auto Scale
    if (
      event["xaxis.autorange"] !== undefined &&
      event["yaxis.autorange"] !== undefined &&
      event["custom"] == null
    ) {
      // event generated by double click
      plotData.autoRange(event);
    }

    // XAxis Changed
    if (
      (event["xaxis.range[0]"] !== null || event["xaxis.range"] !== null) &&
      event["custom"] == null
    ) {
      plotData.syncHorizontalAxis(event);
    }

    // Custom Scale Y Axis
    if (
      event["xaxis.range[0]"] != null &&
      event["yaxis.range[0]"] == null &&
      event["custom"]
    ) {
      plotData.autoScaleVerticalAxis(event);
    }
  };

  const handleInput = (value, event) => {
    setInputValue(value);
    if (event.action == "set-value") setInputValue(event.prevInputValue);
  };

  const squeezeSelect = () => {
    const select = document.querySelector(
      `#select-${id} > div > div:first-child`
    );
    if (select == null) {
      return;
    }
    select.style.maxHeight = "36px";
  };

  const stretchSelect = () => {
    const select = document.querySelector(
      `#select-${id} > div > div:first-child`
    );
    if (select == null) {
      return;
    }
    select.style.maxHeight = "500px";
  };

  const isOptionSelected = (option) => {
    const labels = selectedOptions.map((e) => e.label);
    return labels.includes(option.label);
  };

  return (
    <div className="plot-container">
      <Select
        id={`select-${id}`}
        className="multiselect"
        isMulti
        options={options}
        isOptionSelected={isOptionSelected}
        onChange={handleSelectChange}
        value={selectedOptions}
        closeMenuOnSelect={false}
        inputValue={inputValue}
        onInputChange={handleInput}
        onMenuOpen={stretchSelect}
        onBlur={squeezeSelect}
        menuPortalTarget={document.body}
        styles={{
          menuPortal: (base) => ({ ...base, zIndex: 9999, fontSize: "75%" }),
        }}
      />
      <div className="placeholder" id={`whiteout-${id}`} />
      <div className="d-flex flex-yt">
        <Plot
          className="plot-yt"
          divId={`plot-${id}`}
          data={data}
          onRelayout={relayoutHandler}
          onHover={handleHover}
          onClick={handleHover}
          useResizeHandler
          layout={{
            autoresize: true,
            showlegend: false,
            legend: {
              x: 1,
              xanchor: "right",
              y: 1,
            },
            margin: {
              t: 10,
              b: 25,
              l: 50,
              r: 25,
            },
            xaxis: {
              showspikes: true,
              spikecolor: "#000",
              spikemode: "across+marker",
              spikethickness: 1,
              exponentformat: "e",
            },
            yaxis: {
              exponentformat: "e",
            },
            // hovermode: "x unified",
            hovermode: "x",
            hoverlabel: {
              font: {
                size: 10,
              },
            },
          }}
          config={{
            displayModeBar: false,
          }}
        />
        <GraphOptions plotId={`plot-${id}`} id={id} removeGraph={removeGraph} />
      </div>
    </div>
  );
}
export default Graph;
