from flask import Flask, render_template, g, jsonify, redirect, url_for, abort, flash
import sqlite3
import os
import csv, io, StringIO,json

app = Flask(__name__)
app.config.from_object(__name__)

@app.route("/dataRaw")
def dataRaw():
    con = sqlite3.connect('data.db')
    cur = con.cursor()
    cur.execute('select * from data')
    r = csv2string(cur.fetchall())
    cur.close
    return r

def csv2string(data):
    si = StringIO.StringIO()
    cw = csv.writer(si)
    cw.writerows(data)
    return si.getvalue()

@app.route('/sunburst')
def sun():
    return render_template('sunburst.html')

@app.route('/sunburstO')
def sunO():
    return render_template('sunburstO.html')


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/treemap")
def home():
    return render_template("treemap.html")

@app.route("/barchart")
def makebarchart():
    return render_template("barchart.html")

@app.route("/data")
def Data():
    return json.dumps(get_data())

@app.route("/after/")
def after():
    return render_template('after.html')


DATABASE = 'Tree.db'

@app.route("/tree")
def data():
    return jsonify(get_bindata())

def get_bindata():
    g.db = sqlite3.connect(DATABASE)
    rows = g.db.execute("SELECT binID, count(*) FROM BinEnt group by binID").fetchall()
    RESULTS = {'name': 'BinEnt', 'children': []}
    for i in range(len(rows)):
        RESULTS['children'].append({
            'name': rows[i][0], #binID
            'size': rows[i][1], #num ent in bin
        })
    g.db.close()
    return RESULTS

@app.route("/tree/bin/<int:n>")
def similarbins(n):
    return jsonify(get_similarbins(n))

def get_similarbins(n):
    g.db = sqlite3.connect(DATABASE)
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
    g.db.close()
    return RESULTS

@app.route("/tree/feature/<int:n>")
def binfeatures(n):
    return jsonify(get_binfeatures(n))

def get_binfeatures(n): #gets all bins and features
    g.db = sqlite3.connect(DATABASE)
    rows = g.db.execute("SELECT * FROM BinFeat").fetchall()
    RESULTS = {'name': 'BinFeat', 'children': []}
    for i in range(len(rows)):
        RESULTS['children'].append({
            'name': rows[i][0], #binID
            'feature': rows[i][1], #bin features
        })
    g.db.close()
    return RESULTS

@app.route("/tree/entityfeatures")
def entityfeatures():
    return jsonify(get_entfeatures())

def get_entfeatures(): #gets count of num entities for each feature
    #rows = g.db.execute("SELECT featID, count(*) FROM EntFeat group by featID").fetchall()
    g.db = sqlite3.connect(DATABASE)
    rows = g.db.execute("SELECT * FROM EntFeat").fetchall()
    RESULTS = {'name': 'EntFeat', 'children': []}
    for i in range(len(rows)):
        RESULTS['children'].append({
            'entity': rows[i][0], #feature ID
            'feature': rows[i][1], #num entities with feature
            'observed': rows[i][3] #if observed
        })
    g.db.close()
    return RESULTS

@app.route("/tree/bin/entities/<int:n>")
def binentities(n):
    return jsonify(get_binentities(n))

def get_binentities(n):
    g.db = sqlite3.connect(DATABASE)
    rows = g.db.execute('select entID from BinEnt where binID = {id}'\
        .format(id= n)).fetchall()
    RESULTS = {'name': 'Bin' + str(n), 'children': []}
    for i in range(len(rows)):
        RESULTS['children'].append({
            'name': rows[i][0] #entID in bin
        })
    if RESULTS['children']==[]:
        RESULTS['children'].append({'name':'No similar bins.','size':1})
    g.db.close()
    return RESULTS

# filename = "NPSData2.csv"

# def get_data():
#     fin = file(filename, 'rb')
#     data = fin.read()
#     RESULTS = []
#     for line in csv.DictReader(data.splitlines(), skipinitialspace=True):
#         RESULTS.append({
#             'Category': line['Category'],
#             'Date': line['Date'],
#             'Location': line['Location'],
#         })
#     return RESULTS

DATABASE2 = "NPSDATA.db"
def get_data():
    g.db = sqlite3.connect(DATABASE2)
    rows = g.db.execute("SELECT * FROM NPSData2").fetchall()
    RESULTS = []
    for i in rows:
        RESULTS.append({
            'Category': i[0],
            'Date': i[1],
            'Location': i[2],

        })
    g.db.close()
    return RESULTS

if __name__ == "__main__":
    app.run(debug=True)
