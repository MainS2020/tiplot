import pandas as pd
import threading
from cesium_entity import CesiumEntity

class Store:
    __instance = None
    @staticmethod
    def get():
        __lock = threading.Lock()
        with __lock:
            if Store.__instance is None:
                print("~> Store created")
                Store()
            return Store.__instance

    def __init__(self):
        __lock = threading.Lock()
        with __lock:
            if Store.__instance is not None:
                raise Exception("this class is a singleton!")
            else:
                Store.__instance = self

            self.datadict = {}
            self.extra_datadict = {}
            self.entities = []
            self.info = []
            self.lock = threading.Lock()

    def getStore(self):
        with self.lock:
            return {'entities':self.entities, 'datadict':self.datadict}

    def setStore(self,datadict,entities, info=[]):
        with self.lock:
            self.datadict = datadict
            self.entities = entities
            self.info = info

    def setExtra(self, datadict):
        with self.lock:
            self.extra_datadict = datadict

    def getKeys(self):
        keys = list(self.datadict.keys())
        return keys

    def getEntitiesProps(self):
        data = []
        err = "no error"
        ok = True
        for e in self.entities:
            try:
                if (e.position['table'] == e.attitude['table']):
                    merged = pd.DataFrame.from_dict(self.datadict[e.position['table']])
                else:
                    merged = pd.merge_asof(self.datadict[e.position['table']], self.datadict[e.attitude['table']], on='timestamp_tiplot', suffixes=('', '_drop')).ffill().bfill()
                    merged = merged.loc[:, ~merged.columns.str.endswith('_drop')]
                if e.useXYZ:
                    position_columns = [e.position['x'], e.position['y'], e.position['z']]
                    position_columns_mapped = { e.position['x']: 'x', e.position['y']: 'y', e.position['z']: 'z'}
                else:
                    position_columns = [e.position['altitude'], e.position['lattitude'], e.position['longitude']]
                    position_columns_mapped = { e.position['longitude']: 'longitude', e.position['altitude']: 'altitude', e.position['lattitude']: 'lattitude'}
                if e.useRPY:
                    attitude_columns = [e.attitude['roll'], e.attitude['pitch'], e.attitude['yaw']]
                    attitude_columns_mapped = {e.attitude['roll'] : 'roll', e.attitude['pitch'] : 'pitch', e.attitude['yaw'] : 'yaw'}
                else:
                    attitude_columns = [e.attitude['q0'],e.attitude['q1'],e.attitude['q2'], e.attitude['q3']]
                    attitude_columns_mapped = {e.attitude['q0'] : 'q0', e.attitude['q1'] : 'q1', e.attitude['q2'] : 'q2', e.attitude['q3'] : 'q3'}
                columns = position_columns + attitude_columns + ['timestamp_tiplot']
                mapped_columns = {}
                mapped_columns.update(position_columns_mapped)
                mapped_columns.update(attitude_columns_mapped)
                raw = merged[columns]
                renamed = raw.rename(columns=mapped_columns).to_dict('records')
                data.append({"id": e.id,
                             "name": e.name,
                             "alpha": e.alpha,
                             "scale": e.scale,
                             "useRPY": e.useRPY,
                             "useXYZ": e.useXYZ,
                             "props": renamed,
                             "color": e.color,
                             "wireframe": e.wireframe,
                             "tracked": e.tracked,
                             "active": e.active,
                             "pathColor": e.pathColor})
            except Exception as error:
                err = str(error)
                ok = False
        return data, err, ok

    def getEntities(self):
        data = []
        for e in self.entities:
            data.append(e.toJson())
        return data

    def setEntities(self, entities):
        mapped = []
        for entity in entities:
            mapped.append(CesiumEntity.fromJson(entity))
        self.entities = mapped

    def validateEntities(self, entities):
        for e in entities:
            position = e['position']
            attitude = e['attitude']
            if (position['table'] not in self.datadict):
                msg = "No table \'" + position['table'] + "\' in the datadict."
                return False, msg
            if (attitude['table'] not in self.datadict):
                msg = "No table \'" + position['table'] + "\' in the datadict."
                return False, msg

            if e['useXYZ']: p_columns = ['x', 'y', 'z']
            else: p_columns = ['longitude', 'lattitude', 'altitude']

            for column in p_columns:
                if (position[column] not in self.datadict[position['table']]):
                    msg = "No column \'" + position[column] + "\' in " + position['table']
                    return False, msg

            if e['useRPY']: a_columns = ['roll', 'pitch', 'yaw']
            else: a_columns = ['q0', 'q1', 'q2', 'q3']

            for column in a_columns:
                if (attitude[column] not in self.datadict[attitude['table']]):
                    msg = "No column \'" + attitude[column] + "\' in " + attitude['table']
                    return False, msg

        msg = "config is valid"
        return True,msg

    def getTableColumns(self,key):
        nested = list(self.datadict[key].keys())
        return nested

    def getNestedKeys(self, isExtra = False):
        nested = []
        if isExtra:
            for key in self.extra_datadict.keys():
                k = list(self.extra_datadict[key].keys())
                nested.append({key: k})
        else:
            for key in self.datadict.keys():
                k = list(self.datadict[key].keys())
                nested.append({key: k})
        return nested

    def mergeExtra(self, prefix, delta):
        shifted = {}
        for topic, df in self.extra_datadict.items():
            new_df = df.copy()
            if "timestamp_tiplot" in new_df:
                new_df['timestamp_tiplot'] = new_df['timestamp_tiplot'] + delta
            shifted[topic] = new_df

        prefixed = {prefix + key: value for key, value in shifted.items()}
        self.datadict = {**self.datadict, **prefixed}


