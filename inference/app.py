from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import keras 
import numpy as np
import sys
import os

# 'code' klasörünü Python'un arama yollarına ekle
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'code')))

# env.py'den Cube sınıfını import et
from env import Cube
from model import build_model


# sys.path'e bir geri dizini ekliyoruz
parent_dir = os.path.abspath(os.path.join(os.getcwd(), ".."))
parent_dir += '/Rubic cube A to B (DQN)'

sys.path.append(parent_dir) 


app = Flask(__name__)
CORS(app)


config_path = "Models/extracted2/model.weights.h5"
config_path_best = "Models/Best_model/model.weights.h5"

model = build_model()
model.load_weights(config_path)

# Ana sayfa route'u
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/tahmin', methods=['POST'])
def tahmin():
    veri = request.get_json()   
    girdi = Cube.one_hot_state(np.array(veri['girdi']).flatten()).reshape(1,729)

    sonuc, y_v_i = model.predict(girdi,verbose=0)
    return jsonify({'sonuc': sonuc.tolist(), 'y_v_i': float(y_v_i.squeeze())})

if __name__ == '__main__':
    app.run(debug=True)
