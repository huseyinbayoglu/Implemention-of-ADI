import tensorflow as tf
from tensorflow import keras 


def build_model():
    Dense = keras.layers.Dense
    Input = keras.layers.Input

    initializer = tf.keras.initializers.GlorotUniform()
    input = Input(shape=(27*27,),name="Input")
    x = Dense(4096, activation='elu',name="first_layer",kernel_initializer=initializer)(input)
    x = Dense(2048, activation='elu',name="second_layer",kernel_initializer=initializer)(x)

    third_layer_policy = Dense(512, activation='elu',name="third_layer_for_policy_output",
    kernel_initializer=initializer)(x)
    third_layer_value = Dense(512, activation='elu',name="third_layer_for_value_output",
    kernel_initializer=initializer)(x)

    output_policy = Dense(12, activation='softmax',name="policy_output",
    kernel_initializer=initializer)(third_layer_policy)

    output_value = Dense(1, activation="linear",name="value_output",
    kernel_initializer=initializer)(third_layer_value)

    model = keras.Model(inputs=input, outputs=[output_policy,output_value])

    optimizer = keras.optimizers.RMSprop(learning_rate=1e-4)
    model.compile(optimizer=optimizer,
                  loss=['categorical_crossentropy', 'mse'],
                  loss_weights={'policy_output': 1.0, 'value_output': 4.0},
                  metrics={'policy_output': ['accuracy'], 'value_output': ['mse']})


    return model

def build_model2():
    Dense = keras.layers.Dense
    Input = keras.layers.Input
    batch_norm = keras.layers.BatchNormalization
    dropout = keras.layers.Dropout

    initializer = tf.keras.initializers.GlorotUniform()
    input = Input(shape=(27*27,),name="Input")
    x = Dense(4096, activation='elu',name="first_layer",kernel_initializer=initializer)(input)
    x = batch_norm()(x)
    x = dropout(0.5)(x)

    x = Dense(2048, activation='elu',name="second_layer",kernel_initializer=initializer)(x)
    x = batch_norm()(x)
    x = dropout(0.5)(x)

    third_layer_policy = Dense(512, activation='elu',name="third_layer_for_policy_output",
    kernel_initializer=initializer)(x)
    # third_layer_policy = batch_norm()(third_layer_policy)
    third_layer_policy = dropout(0.5)(third_layer_policy)

    third_layer_value = Dense(512, activation='elu',name="third_layer_for_value_output",
    kernel_initializer=initializer)(x)
    third_layer_value = batch_norm()(third_layer_value)
    third_layer_value = dropout(0.5)(third_layer_value)

    output_policy = Dense(12, activation='softmax',name="policy_output",
    kernel_initializer=initializer)(third_layer_policy)

    output_value = Dense(1, activation="linear",name="value_output",
    kernel_initializer=initializer)(third_layer_value)

    model = keras.Model(inputs=input, outputs=[output_policy,output_value])

    model.compile(optimizer="adam",
                  loss=['categorical_crossentropy', 'mse'],
                  loss_weights={'policy_output': 1.0, 'value_output': 2.0},
                  metrics={'policy_output': ['accuracy'], 'value_output': ['mse']})


    return model

def build_model3():
    Dense = keras.layers.Dense
    Input = keras.layers.Input

    initializer = tf.keras.initializers.GlorotUniform()
    input = Input(shape=(27*27,),name="Input")
    x = Dense(1024, activation='elu',name="first_layer",kernel_initializer=initializer)(input)
    x = Dense(1024, activation='elu',name="second_layer",kernel_initializer=initializer)(x)

    third_layer_policy = Dense(128, activation='elu',name="third_layer_for_policy_output",
    kernel_initializer=initializer)(x)
    third_layer_value = Dense(128, activation='elu',name="third_layer_for_value_output",
    kernel_initializer=initializer)(x)

    output_policy = Dense(12, activation='softmax',name="policy_output",
    kernel_initializer=initializer)(third_layer_policy)

    output_value = Dense(1, activation="linear",name="value_output",
    kernel_initializer=initializer)(third_layer_value)

    model = keras.Model(inputs=input, outputs=[output_policy,output_value])

    optimizer = keras.optimizers.RMSprop(learning_rate=1e-4)
    model.compile(optimizer=optimizer,
                  loss=['categorical_crossentropy', 'mse'],
                  loss_weights={'policy_output': 1.0, 'value_output': 4.0},
                  metrics={'policy_output': ['accuracy'], 'value_output': ['mse']})


    return model


if __name__ == "__main__":
    model = build_model()
    model.summary()

