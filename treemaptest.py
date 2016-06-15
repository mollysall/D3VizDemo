'''
Created on Jun 8, 2016

@author: hrobinson
'''

from flask import Flask, render_template, g, jsonify
import sqlite3

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("treemap.html")

@app.route("/barchart")
def makebarchart():
    return render_template("barchart.html")


DATABASE = 'Tree.db'

@app.before_request
def before_request():
    g.db = sqlite3.connect(DATABASE)

@app.teardown_request
def teardown_request(exception):
    if hasattr(g, 'db'):
        g.db.close()

@app.route("/tree")
def data():
    return jsonify(get_bindata())

def get_bindata():
    rows = g.db.execute("SELECT binID, count(*) FROM BinEnt group by binID").fetchall()
    RESULTS = {'name': 'BinEnt', 'children': []}
    for i in range(len(rows)):
        RESULTS['children'].append({
            'name': rows[i][0], #binID
            'size': rows[i][1], #num ent in bin
        })
    return RESULTS

@app.route("/tree/bin/<int:n>")
def similarbins(n):
    return jsonify(get_similarbins(n))

def get_similarbins(n):
    rows = g.db.execute('SELECT binID, count(*) FROM BinEnt where entID in (select entID from BinEnt where binID = {id}) group by binID'\
        .format(id= n)).fetchall()
    RESULTS = {'name': 'Bin' + str(n), 'children': []}
    for i in range(len(rows)):
        if rows[i][0] != n:
            RESULTS['children'].append({
                'name': rows[i][0], #binID
                'size': rows[i][1], #num ent in bin
        })
    if RESULTS['children']==[]:
        RESULTS['children'].append({'name':'No similar bins.','size':1})       
    return RESULTS

@app.route("/tree/feature/<int:n>")
def binfeatures(n):
    return jsonify(get_binfeatures(n))

def get_binfeatures(n): #gets all bins and features
    rows = g.db.execute("SELECT * FROM BinFeat").fetchall()
    RESULTS = {'name': 'BinFeat', 'children': []}
    for i in range(len(rows)):
        RESULTS['children'].append({
            'name': rows[i][0], #binID
            'feature': rows[i][1], #bin features
        })
    return RESULTS

@app.route("/tree/entityfeatures")
def entityfeatures():
    return jsonify(get_entfeatures())

def get_entfeatures(): #gets count of num entities for each feature
    #rows = g.db.execute("SELECT featID, count(*) FROM EntFeat group by featID").fetchall()
    rows = g.db.execute("SELECT * FROM EntFeat").fetchall()
    RESULTS = {'name': 'EntFeat', 'children': []}
    for i in range(len(rows)):
        RESULTS['children'].append({
            'entity': rows[i][0], #feature ID
            'feature': rows[i][1], #num entities with feature
            'observed': rows[i][3] #if observed
        })
    return RESULTS

@app.route("/tree/bin/entities/<int:n>")
def binentities(n):
    return jsonify(get_binentities(n))

def get_binentities(n):
    rows = g.db.execute('select entID from BinEnt where binID = {id}'\
        .format(id= n)).fetchall()
    RESULTS = {'name': 'Bin' + str(n), 'children': []}
    for i in range(len(rows)):
        RESULTS['children'].append({
            'name': rows[i][0] #entID in bin
        })
    if RESULTS['children']==[]:
        RESULTS['children'].append({'name':'No similar bins.','size':1})       
    print RESULTS
    return RESULTS

if __name__ == "__main__":
    app.run(debug=True)
